import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface DayRow {
  date: string;
  sales: number;
  orders: number;
  cancelled: number;
}

interface DishRow {
  name: string;
  quantity: number;
  sales: number;
}

const SUMMARY_CUSTOMER_PHONE = "foodpanda-daily-summary";

/** Distributes `total` whole units across `weights` (proportional shares), preserving the exact sum. */
function allocateProportional(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const raw = weights.map((w) => total * w);
  const floors = raw.map(Math.floor);
  const remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remainder && order.length > 0; k++) {
    result[order[k % order.length].i] += 1;
  }
  return result;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const days: DayRow[] = body.days ?? [];
  const dishes: DishRow[] = body.dishes ?? [];

  if (days.length === 0) {
    return NextResponse.json({ error: "No day rows provided" }, { status: 400 });
  }

  const menuItems = await prisma.menuItem.findMany();
  const byName = new Map(menuItems.map((m) => [m.name.trim().toLowerCase(), m]));

  const matchedDishes: { name: string; quantity: number; menuItemId: string }[] = [];
  const unmatchedDishes: string[] = [];
  for (const dish of dishes) {
    const menuItem = byName.get(dish.name.trim().toLowerCase());
    if (menuItem) {
      matchedDishes.push({ name: dish.name, quantity: dish.quantity, menuItemId: menuItem.id });
    } else if (dish.name) {
      unmatchedDishes.push(dish.name);
    }
  }

  const validDays = days.filter((d) => d.sales > 0 || d.orders > 0);

  const customer = await prisma.customer.upsert({
    where: { phone: SUMMARY_CUSTOMER_PHONE },
    update: {},
    create: { name: "Foodpanda (imported)", phone: SUMMARY_CUSTOMER_PHONE, address: null },
  });

  // Build one order slot per real Foodpanda order, splitting each day's sales evenly across its order count.
  const slots: { date: Date; amount: number; orderIndex: number; dayOrders: number; cancelled: number }[] = [];
  for (const day of validDays) {
    const date = new Date(day.date);
    if (isNaN(date.getTime())) continue;
    const count = Math.max(day.orders, 1);
    const perOrder = Math.round((day.sales / count) * 100) / 100;
    for (let i = 0; i < count; i++) {
      slots.push({ date, amount: perOrder, orderIndex: i, dayOrders: count, cancelled: day.cancelled });
    }
  }

  if (slots.length === 0) {
    return NextResponse.json({ imported: 0, skipped: days.length, costRatio: 0, matchedDishes: [], unmatchedDishes });
  }

  const totalRevenue = slots.reduce((sum, s) => sum + s.amount, 0);
  const weights = slots.map((s) => (totalRevenue > 0 ? s.amount / totalRevenue : 1 / slots.length));

  // Allocate each matched dish's total quantity across the order slots, proportional to each slot's revenue share.
  const allocationPerSlot: { menuItemId: string; menuItemName: string; quantity: number }[][] = slots.map(() => []);
  for (const dish of matchedDishes) {
    const allocation = allocateProportional(dish.quantity, weights);
    allocation.forEach((qty, i) => {
      if (qty > 0) allocationPerSlot[i].push({ menuItemId: dish.menuItemId, menuItemName: dish.name, quantity: qty });
    });
  }

  let imported = 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const itemsForSlot = allocationPerSlot[i];
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    await prisma.order.create({
      data: {
        customerId: customer.id,
        channel: "FOODPANDA",
        status: "DELIVERED",
        deliveryAddress: "",
        notes: `Imported from Foodpanda daily report (order ${slot.orderIndex + 1} of ${slot.dayOrders} that day; item mix estimated from the popular dishes report).`,
        totalAmount: slot.amount,
        createdAt: slot.date,
        updatedAt: slot.date,
        items: {
          create: itemsForSlot.map((it) => {
            const menuItem = menuItemMap.get(it.menuItemId)!;
            return {
              menuItemId: it.menuItemId,
              quantity: it.quantity,
              priceAtSale: menuItem.price,
              costAtSale: menuItem.costPrice,
              packagingCostAtSale: menuItem.packagingCostPrice,
            };
          }),
        },
      },
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    skipped: days.length - validDays.length,
    orderCount: slots.length,
    matchedDishes: matchedDishes.map((d) => d.name),
    unmatchedDishes,
  });
}
