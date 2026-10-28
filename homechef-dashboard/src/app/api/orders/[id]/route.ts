import { NextRequest, NextResponse } from "next/server";
import { MenuItem } from "@prisma/client";
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

export const maxDuration = 30;

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const VALID_PAYMENT_STATUSES = ["PENDING", "PAID"];

interface EditBody {
  status?: string;
  paymentStatus?: string;
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

const EDIT_INCLUDE = { customer: true, items: { include: { menuItem: true } } };

async function loadEditableOrder(id: string) {
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: true, customer: true } });
  if (!existing) throw new Error("Order not found");
  if (existing.channel !== "DIRECT") {
    throw new Error("Only direct orders can be edited — Foodpanda orders come from the imports");
  }
  return existing;
}

type ExistingOrder = Awaited<ReturnType<typeof loadEditableOrder>>;

function buildItemsData(items: NonNullable<EditBody["items"]>, existing: ExistingOrder, menuItems: MenuItem[]) {
  const oldByMenuItem = new Map(existing.items.map((i) => [i.menuItemId, i]));
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
  return { itemsData, subtotal };
}

async function applyOrderEdit(
  id: string,
  body: EditBody,
  existing: ExistingOrder,
  itemsData: ReturnType<typeof buildItemsData>["itemsData"],
  subtotal: number,
  charges: { discount: number; deliveryCharge: number; tip: number },
  orderDate: Date | null
) {
  const [oldNeed, need] = await Promise.all([baseRequirements(prisma, existing.items), baseRequirements(prisma, body.items!)]);

  // Same customer, unchanged phone: keep the link instead of minting a placeholder customer.
  const keepCustomer = !body.customerId && (!body.phone?.trim() || body.phone.trim() === existing.customer.phone);

  return prisma.$transaction(
    async (tx) => {
      // Put the old items back in stock, then take the new ones out.
      await applyStockDelta(tx, oldNeed, "restore");
      await assertStockCovers(tx, need);
      await applyStockDelta(tx, need, "take");

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
          ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus as never }),
          deliveryAddress: body.address?.trim() ?? existing.deliveryAddress,
          notes: body.notes?.trim() || null,
          ...(orderDate && { createdAt: orderDate }),
          totalAmount: subtotal - charges.discount + charges.deliveryCharge + charges.tip,
          discount: charges.discount,
          deliveryCharge: charges.deliveryCharge,
          tip: charges.tip,
          items: { create: itemsData },
        },
        include: EDIT_INCLUDE,
      });
    },
    { maxWait: 10_000, timeout: 20_000 }
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as EditBody;

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body.paymentStatus !== undefined && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  // Status-only / payment-only update — allowed for any order, no item changes.
  if (!body.items) {
    if (body.status === undefined && body.paymentStatus === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status as never }),
        ...(body.paymentStatus !== undefined && { paymentStatus: body.paymentStatus as never }),
      },
      include: EDIT_INCLUDE,
    });
    // Stock only reacts to kitchen status (delivered/cancelled/wastage), not payment — skip the resync when only paymentStatus changed.
    if (body.status !== undefined) await syncOrderStock(prisma, id);
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
    // Look everything up first, so the transaction below only has a few quick writes to do.
    const existing = await loadEditableOrder(id);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
    const { itemsData, subtotal } = buildItemsData(items, existing, menuItems);
    if (discount > subtotal) throw new Error("Discount can't exceed the items subtotal");

    const updated = await applyOrderEdit(id, body, existing, itemsData, subtotal, { discount, deliveryCharge, tip }, orderDate);
    await syncOrderStock(prisma, id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update order" }, { status: 400 });
  }
}
