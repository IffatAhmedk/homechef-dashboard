import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost } from "@/lib/recipe-cost";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params;
  const { quantity } = await req.json();

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be greater than 0" }, { status: 400 });
  }

  const line = await prisma.recipeLine.update({
    where: { id: lineId },
    data: { quantity: Number(quantity) },
    include: { ingredient: true, componentItem: true },
  });

  await recomputeItemCost(id);

  return NextResponse.json(line);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const { id, lineId } = await params;
  await prisma.recipeLine.delete({ where: { id: lineId } });
  await recomputeItemCost(id);
  return NextResponse.json({ ok: true });
}
