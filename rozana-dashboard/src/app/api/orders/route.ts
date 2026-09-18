import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
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
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, address, notes, items } = body as {
    name: string;
    phone: string;
    address: string;
    notes?: string;
    items: CartLine[];
  };

  if (!name || !phone || !address) {
    return NextResponse.json({ error: "name, phone and address are required" }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
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
        if (menuItem.stockQty < line.quantity) {
          throw new Error(`Not enough stock for ${menuItem.name}`);
        }
        total += menuItem.price * line.quantity;
        return {
          menuItemId: menuItem.id,
          quantity: line.quantity,
          priceAtSale: menuItem.price,
        };
      });

      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name, address },
        create: { name, phone, address },
      });

      for (const line of items) {
        await tx.menuItem.update({
          where: { id: line.menuItemId },
          data: { stockQty: { decrement: line.quantity } },
        });
      }

      return tx.order.create({
        data: {
          customerId: customer.id,
          deliveryAddress: address,
          notes: notes ?? null,
          totalAmount: total,
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
