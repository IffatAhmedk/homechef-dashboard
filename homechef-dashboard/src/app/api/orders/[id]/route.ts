import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomer } from "@/lib/customer";
import { syncOrderStock } from "@/lib/stock-ledger";
import { assertStockCovers, applyStockDelta, baseRequirements } from "@/lib/stock";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { menuItem: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

interface EditBody {
  status?: string;
  customerId?: string;
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  discount?: number;
  deliveryCharge?: number;
  tip?: number;
  items?: { menuItemId: string; quantity: number; price?: number }[];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as EditBody;

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const include = { customer: true, items: { include: { menuItem: true } } };

  // Status-only update — allowed for any order.
  if (!body.items) {
    if (!body.status) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    const order = await prisma.order.update({ where: { id }, data: { status: body.status as never }, include });
    await syncOrderStock(prisma, id);
    return NextResponse.json(order);
  }

  const { items } = body;
  if (items.length === 0) return NextResponse.json({ error: "Add at least one item" }, { status: 400 });
  if (!body.name) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });

  const discount = Number(body.discount) || 0;
  const deliveryCharge = Number(body.deliveryCharge) || 0;
  const tip = Number(body.tip) || 0;
  if (discount < 0 || deliveryCharge < 0 || tip < 0) {
    return NextResponse.json({ error: "Discount, delivery charge and tip can't be negative" }, { status: 400 });
  }
  const orderDate = body.createdAt ? new Date(body.createdAt) : null;
  if (orderDate && isNaN(orderDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, include: { items: true, customer: true } });
      if (!existing) throw new Error("Order not found");
      if (existing.channel !== "DIRECT") {
        throw new Error("Only direct orders can be edited — Foodpanda orders come from the imports");
      }

      // Put the old items back in stock, then take the new ones out.
      await applyStockDelta(tx, await baseRequirements(tx, existing.items), "restore");
      const oldByMenuItem = new Map(existing.items.map((i) => [i.menuItemId, i]));
      const menuItems = await tx.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });

      let subtotal = 0;
      const itemsData = items.map((line) => {
        const menuItem = menuItems.find((m) => m.id === line.menuItemId);
        if (!menuItem) throw new Error(`Menu item ${line.menuItemId} not found`);
        const previous = oldByMenuItem.get(line.menuItemId);
        if (!previous && !menuItem.isAvailable) throw new Error(`${menuItem.name} is currently unavailable`);
        const priceAtSale = line.price != null ? line.price : (previous?.priceAtSale ?? menuItem.price);
        subtotal += priceAtSale * line.quantity;
        return {
          menuItemId: menuItem.id,
          quantity: line.quantity,
          priceAtSale,
          // Keep the cost the order was originally booked at for lines that were already on it.
          costAtSale: previous ? previous.costAtSale : menuItem.costPrice,
          packagingCostAtSale: previous ? previous.packagingCostAtSale : menuItem.packagingCostPrice,
        };
      });
      if (discount > subtotal) throw new Error("Discount can't exceed the items subtotal");

      const need = await baseRequirements(tx, items);
      await assertStockCovers(tx, need);
      await applyStockDelta(tx, need, "take");

      // Same customer, unchanged phone: keep the link instead of minting a placeholder customer.
      const keepCustomer =
        !body.customerId && (!body.phone?.trim() || body.phone.trim() === existing.customer.phone);
      const customer = await resolveCustomer(tx, {
        customerId: body.customerId ?? (keepCustomer ? existing.customerId : undefined),
        name: body.name!,
        phone: body.phone,
        address: body.address,
      });

      await tx.orderItem.deleteMany({ where: { orderId: id } });
      return tx.order.update({
        where: { id },
        data: {
          customerId: customer.id,
          ...(body.status && { status: body.status as never }),
          deliveryAddress: body.address?.trim() ?? existing.deliveryAddress,
          notes: body.notes?.trim() || null,
          ...(orderDate && { createdAt: orderDate }),
          totalAmount: subtotal - discount + deliveryCharge + tip,
          discount,
          deliveryCharge,
          tip,
          items: { create: itemsData },
        },
        include,
      });
    });
    await syncOrderStock(prisma, id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update order" }, { status: 400 });
  }
}
