import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingredientStockLevels, recordStockEntry } from "@/lib/stock-ledger";

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
  const { name, unit, costPerUnit, category, purchase } = (await req.json()) as {
    name?: string;
    unit?: string;
    costPerUnit?: number;
    category?: "FOOD" | "PACKAGING";
    purchase?: { quantity: number; totalCost: number; date?: string };
  };
  if (!name || !unit || (costPerUnit == null && !purchase)) {
    return NextResponse.json({ error: "name and unit are required, plus either a cost per unit or what you bought" }, { status: 400 });
  }
  if (purchase && (!(purchase.quantity > 0) || !(purchase.totalCost > 0))) {
    return NextResponse.json({ error: "Enter how much you bought and what you paid" }, { status: 400 });
  }
  const boughtOn = purchase?.date ? new Date(purchase.date) : undefined;
  if (boughtOn && isNaN(boughtOn.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      costPerUnit: costPerUnit != null ? Number(costPerUnit) : 0,
      ...(category && { category }),
    },
  });

  if (purchase) {
    await recordStockEntry(ingredient.id, {
      type: "PURCHASE",
      quantity: Number(purchase.quantity),
      totalCost: Number(purchase.totalCost),
      date: boughtOn,
    });
  }

  return NextResponse.json(ingredient, { status: 201 });
}
