import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availableQuantities } from "@/lib/stock";
import { recomputeItemCost } from "@/lib/recipe-cost";

export async function GET() {
  const items = await prisma.menuItem.findMany({
    include: { category: true, _count: { select: { recipeLines: true } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  const available = await availableQuantities();
  return NextResponse.json(items.map((i) => ({ ...i, availableQty: available.get(i.id) ?? i.stockQty })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, price, costPrice, categoryId, stockQty, isAvailable, imageUrl, isDeal, components } = body as {
    name?: string; description?: string; price?: number; costPrice?: number; categoryId?: string; stockQty?: number;
    isAvailable?: boolean; imageUrl?: string; isDeal?: boolean; components?: { menuItemId: string; quantity: number }[];
  };

  if (!name || !price || !categoryId) {
    return NextResponse.json({ error: "name, price and categoryId are required" }, { status: 400 });
  }

  if (isDeal) {
    if (!components || components.length === 0) {
      return NextResponse.json({ error: "A deal needs at least one item" }, { status: 400 });
    }
    const ids = components.map((c) => c.menuItemId);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "Each item can only be added to a deal once — adjust its quantity instead" }, { status: 400 });
    }
    if (components.some((c) => !(Number(c.quantity) > 0))) {
      return NextResponse.json({ error: "Every item in the deal needs a quantity above 0" }, { status: 400 });
    }
    const found = await prisma.menuItem.count({ where: { id: { in: ids } } });
    if (found !== ids.length) return NextResponse.json({ error: "One of the selected items no longer exists" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description ?? null,
      price: Number(price),
      costPrice: costPrice != null ? Number(costPrice) : 0,
      categoryId,
      stockQty: isDeal ? 0 : stockQty != null ? Number(stockQty) : 0,
      isDeal: !!isDeal,
      ...(isDeal && {
        recipeLines: { create: components!.map((c) => ({ componentItemId: c.menuItemId, quantity: Number(c.quantity) })) },
      }),
      isAvailable: isAvailable ?? true,
      imageUrl: imageUrl ?? null,
    },
  });

  if (isDeal) await recomputeItemCost(item.id);

  return NextResponse.json(await prisma.menuItem.findUnique({ where: { id: item.id } }), { status: 201 });
}
