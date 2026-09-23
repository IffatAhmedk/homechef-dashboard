import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemsUsingIngredient } from "@/lib/recipe-cost";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, unit, costPerUnit, category } = await req.json();

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(costPerUnit !== undefined && { costPerUnit: Number(costPerUnit) }),
      ...(category !== undefined && { category }),
    },
  });

  if (costPerUnit !== undefined || category !== undefined) {
    await recomputeItemsUsingIngredient(id);
  }

  return NextResponse.json(ingredient);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const usageCount = await prisma.recipeLine.count({ where: { ingredientId: id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: `This ingredient is used in ${usageCount} recipe(s). Remove it from those recipes first.` },
      { status: 400 }
    );
  }

  await prisma.ingredient.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
