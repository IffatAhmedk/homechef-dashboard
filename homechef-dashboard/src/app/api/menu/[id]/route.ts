import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost, recomputeItemsUsingComponent } from "@/lib/recipe-cost";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, price, costPrice, categoryId, stockQty, isAvailable, imageUrl, batchYield, components } = body as {
    name?: string; description?: string | null; price?: number; costPrice?: number; categoryId?: string; stockQty?: number;
    isAvailable?: boolean; imageUrl?: string | null; batchYield?: number; components?: { menuItemId: string; quantity: number }[];
  };

  const current = await prisma.menuItem.findUnique({ where: { id }, select: { costIsAuto: true, isDeal: true } });
  if (!current) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  // Server-side guards: an auto-calculated cost and a deal's derived stock can't be overwritten.
  if (components !== undefined) {
    if (!current.isDeal) return NextResponse.json({ error: "Only deals are built from other items" }, { status: 400 });
    const ids = components.map((c) => c.menuItemId);
    if (components.length === 0) return NextResponse.json({ error: "A deal needs at least one item" }, { status: 400 });
    if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "Each item can only be added once — change its quantity instead" }, { status: 400 });
    if (ids.includes(id)) return NextResponse.json({ error: "A deal can't contain itself" }, { status: 400 });
    if (components.some((c) => !(Number(c.quantity) > 0))) return NextResponse.json({ error: "Every item needs a quantity above 0" }, { status: 400 });
    const found = await prisma.menuItem.findMany({ where: { id: { in: ids } }, select: { id: true, isDeal: true } });
    if (found.length !== ids.length) return NextResponse.json({ error: "One of the selected items no longer exists" }, { status: 400 });
    if (found.some((f) => f.isDeal)) return NextResponse.json({ error: "A deal can't contain another deal" }, { status: 400 });
    await prisma.$transaction([
      prisma.recipeLine.deleteMany({ where: { menuItemId: id } }),
      prisma.recipeLine.createMany({ data: components.map((c) => ({ menuItemId: id, componentItemId: c.menuItemId, quantity: Number(c.quantity) })) }),
    ]);
  }

  const acceptCost = costPrice !== undefined && !current.costIsAuto;
  const acceptStock = stockQty !== undefined && !current.isDeal;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(acceptCost && { costPrice: Number(costPrice) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(acceptStock && { stockQty: Number(stockQty) }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(batchYield !== undefined && { batchYield: Number(batchYield) }),
    },
  });

  if (components !== undefined) await recomputeItemCost(id);
  if (batchYield !== undefined) {
    // Yield changed the per-serving math for a recipe-costed item — recompute from its lines.
    await recomputeItemCost(id);
  }
  if (acceptCost) {
    // A manual cost change can make this item priced/unpriced for its own parents (deals).
    await recomputeItemsUsingComponent(id);
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [orderCount, usedIn] = await Promise.all([
    prisma.orderItem.count({ where: { menuItemId: id } }),
    prisma.recipeLine.findMany({ where: { componentItemId: id }, select: { menuItem: { select: { name: true, isDeal: true } } } }),
  ]);

  if (usedIn.length > 0) {
    const names = [...new Set(usedIn.map((l) => l.menuItem.name))].join(", ");
    return NextResponse.json(
      { error: `It's part of ${names}. Remove it from there first.`, reason: "in-use" },
      { status: 409 }
    );
  }
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `It's on ${orderCount} past order${orderCount === 1 ? "" : "s"}, so deleting it would break your history.`, reason: "orders" },
      { status: 409 }
    );
  }

  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
