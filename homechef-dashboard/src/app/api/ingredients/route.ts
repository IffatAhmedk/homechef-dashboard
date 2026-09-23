import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingredientStockLevels } from "@/lib/stock-ledger";

export async function GET() {
  const [ingredients, levels] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    ingredientStockLevels(),
  ]);
  return NextResponse.json(
    ingredients.map((i) => ({
      ...i,
      stockQty: levels.get(i.id)?.stockQty ?? 0,
      tracked: levels.get(i.id)?.tracked ?? false,
      avgDailyUse: levels.get(i.id)?.avgDailyUse ?? 0,
      daysLeft: levels.get(i.id)?.daysLeft ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const { name, unit, costPerUnit, category } = await req.json();
  if (!name || !unit || costPerUnit == null) {
    return NextResponse.json({ error: "name, unit and costPerUnit are required" }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      costPerUnit: Number(costPerUnit),
      ...(category && { category }),
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
