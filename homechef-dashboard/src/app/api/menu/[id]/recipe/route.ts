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

/** Saves a whole recipe at once: the serving count and the full list of ingredients with quantities. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { batchYield, lines } = (await req.json()) as {
    batchYield?: number;
    lines?: { ingredientId: string; quantity: number }[];
  };

  const item = await prisma.menuItem.findUnique({ where: { id }, select: { isDeal: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.isDeal) return NextResponse.json({ error: "Deals are made of menu items and don't have a recipe" }, { status: 400 });

  const servings = Number(batchYield ?? 1);
  if (!Number.isInteger(servings) || servings < 1) {
    return NextResponse.json({ error: "Servings must be a whole number, 1 or more" }, { status: 400 });
  }
  const merged = new Map<string, number>();
  for (const line of lines ?? []) {
    if (!line.ingredientId || !(Number(line.quantity) > 0)) {
      return NextResponse.json({ error: "Every ingredient needs a quantity above 0" }, { status: 400 });
    }
    merged.set(line.ingredientId, (merged.get(line.ingredientId) ?? 0) + Number(line.quantity));
  }
  const found = await prisma.ingredient.count({ where: { id: { in: [...merged.keys()] } } });
  if (found !== merged.size) return NextResponse.json({ error: "One of the ingredients no longer exists" }, { status: 400 });

  await prisma.$transaction([
    prisma.recipeLine.deleteMany({ where: { menuItemId: id, ingredientId: { not: null } } }),
    prisma.recipeLine.createMany({
      data: [...merged].map(([ingredientId, quantity]) => ({ menuItemId: id, ingredientId, quantity })),
    }),
    prisma.menuItem.update({ where: { id }, data: { batchYield: servings } }),
  ]);
  await recomputeItemCost(id);

  const updated = await prisma.menuItem.findUnique({ where: { id }, select: { costPrice: true, costIsAuto: true, batchYield: true } });
  return NextResponse.json(updated);
}
