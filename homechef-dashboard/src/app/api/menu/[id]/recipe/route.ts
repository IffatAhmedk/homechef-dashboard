import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost } from "@/lib/recipe-cost";

/** Returns true if `startItemId`'s recipe transitively includes `targetItemId` as a component. */
async function usesItemAsComponent(startItemId: string, targetItemId: string, visited = new Set<string>()): Promise<boolean> {
  if (startItemId === targetItemId) return true;
  if (visited.has(startItemId)) return false;
  visited.add(startItemId);

  const lines = await prisma.recipeLine.findMany({
    where: { menuItemId: startItemId, componentItemId: { not: null } },
    select: { componentItemId: true },
  });

  for (const line of lines) {
    if (line.componentItemId && (await usesItemAsComponent(line.componentItemId, targetItemId, visited))) {
      return true;
    }
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lines = await prisma.recipeLine.findMany({
    where: { menuItemId: id },
    include: { ingredient: true, componentItem: true },
  });
  return NextResponse.json(lines);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ingredientId, componentItemId, quantity } = await req.json();

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be greater than 0" }, { status: 400 });
  }
  if (!ingredientId && !componentItemId) {
    return NextResponse.json({ error: "Select an ingredient or a menu item" }, { status: 400 });
  }
  if (componentItemId === id) {
    return NextResponse.json({ error: "An item can't be an ingredient of itself" }, { status: 400 });
  }
  if (componentItemId && (await usesItemAsComponent(componentItemId, id))) {
    return NextResponse.json({ error: "That would create a circular recipe (A uses B which uses A)" }, { status: 400 });
  }

  const line = await prisma.recipeLine.create({
    data: {
      menuItemId: id,
      ingredientId: ingredientId || null,
      componentItemId: componentItemId || null,
      quantity: Number(quantity),
    },
    include: { ingredient: true, componentItem: true },
  });

  await recomputeItemCost(id);

  return NextResponse.json(line, { status: 201 });
}
