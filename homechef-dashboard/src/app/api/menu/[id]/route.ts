import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost, recomputeItemsUsingComponent } from "@/lib/recipe-cost";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, price, costPrice, categoryId, stockQty, isAvailable, imageUrl, batchYield } = body;

  const current = await prisma.menuItem.findUnique({ where: { id }, select: { costIsAuto: true, isDeal: true } });
  if (!current) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  // Server-side guards: an auto-calculated cost and a deal's derived stock can't be overwritten.
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
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
