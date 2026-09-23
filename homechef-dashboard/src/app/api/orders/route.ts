import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/customer";
import { assertStockCovers, applyStockDelta, baseRequirements } from "@/lib/stock";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(from || to ? { createdAt } : {}),
    },
    include: {
      customer: true,
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

interface CartLine {
  menuItemId: string;
  quantity: number;
  price?: number;
}

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId, name, phone, address, notes, items, channel, status, createdAt, discount, deliveryCharge, tip } = body as {
    customerId?: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
    items: CartLine[];
    channel?: "DIRECT" | "FOODPANDA";
    status?: string;
    createdAt?: string;
    discount?: number;
    deliveryCharge?: number;
    tip?: number;
  };

  if (!name) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const discountAmount = Number(discount) || 0;
  const deliveryChargeAmount = Number(deliveryCharge) || 0;
  const tipAmount = Number(tip) || 0;
  if (discountAmount < 0 || deliveryChargeAmount < 0 || tipAmount < 0) {
    return NextResponse.json({ error: "Discount, delivery charge and tip can't be negative" }, { status: 400 });
  }

  const orderDate = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(orderDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: items.map((i) => i.menuItemId) } },
      });

      let total = 0;
      const orderItemsData = items.map((line) => {
        const menuItem = menuItems.find((m) => m.id === line.menuItemId);
        if (!menuItem) throw new Error(`Menu item ${line.menuItemId} not found`);
        if (!menuItem.isAvailable) throw new Error(`${menuItem.name} is currently unavailable`);
        const priceAtSale = line.price != null ? line.price : menuItem.price;
        total += priceAtSale * line.quantity;
        return {
          menuItemId: menuItem.id,
          quantity: line.quantity,
          priceAtSale,
          costAtSale: menuItem.costPrice,
          packagingCostAtSale: menuItem.packagingCostPrice,
        };
      });

      if (discountAmount > total) throw new Error("Discount can't exceed the items subtotal");

      const resolvedAddress = address?.trim() || "";
      const customer = await resolveCustomer(tx, { customerId, name, phone, address });

      // Deals draw down their base items; plain items draw down themselves.
      const need = await baseRequirements(tx, items);
      await assertStockCovers(tx, need);
      await applyStockDelta(tx, need, "take");

      return tx.order.create({
        data: {
          customerId: customer.id,
          channel: channel ?? "DIRECT",
          status: (status as never) ?? "PENDING",
          deliveryAddress: resolvedAddress,
          notes: notes ?? null,
          totalAmount: total - discountAmount + deliveryChargeAmount + tipAmount,
          discount: discountAmount,
          deliveryCharge: deliveryChargeAmount,
          tip: tipAmount,
          createdAt: orderDate,
          updatedAt: orderDate,
          items: { create: orderItemsData },
        },
        include: { items: { include: { menuItem: true } }, customer: true },
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
