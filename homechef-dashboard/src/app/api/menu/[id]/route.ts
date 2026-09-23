import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost, recomputeItemsUsingComponent } from "@/lib/recipe-cost";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, price, costPrice, categoryId, stockQty, isAvailable, imageUrl, batchYield } = body;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: Number(price) }),
      ...(costPrice !== undefined && { costPrice: Number(costPrice) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(stockQty !== undefined && { stockQty: Number(stockQty) }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(batchYield !== undefined && { batchYield: Number(batchYield) }),
    },
  });

  if (batchYield !== undefined) {
    // Yield changed the per-serving math for a recipe-costed item — recompute from its lines.
    await recomputeItemCost(id);
  }
  if (costPrice !== undefined) {
    await recomputeItemsUsingComponent(id);
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
