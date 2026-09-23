import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemsUsingIngredient } from "@/lib/recipe-cost";

interface ImportRow {
  name: string;
  unit: string;
  cost_per_unit: string | number;
  category?: string;
}

function normalizeCategory(raw: string | undefined): "FOOD" | "PACKAGING" {
  return raw && /^pack/i.test(raw.trim()) ? "PACKAGING" : "FOOD";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: { row: string; message: string }[] = [];

  const allIngredients = await prisma.ingredient.findMany();

  for (const row of rows) {
    const name = (row.name ?? "").trim();
    const unit = (row.unit ?? "").trim();
    const costPerUnit = Number(row.cost_per_unit);

    if (!name || !unit || isNaN(costPerUnit)) {
      errors.push({ row: name || "(blank)", message: "name, unit and cost_per_unit are all required" });
      continue;
    }

    const category = normalizeCategory(row.category);
    const existing = allIngredients.find((i) => i.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      await prisma.ingredient.update({ where: { id: existing.id }, data: { unit, costPerUnit, category } });
      await recomputeItemsUsingIngredient(existing.id);
      updated++;
    } else {
      const newIngredient = await prisma.ingredient.create({ data: { name, unit, costPerUnit, category } });
      allIngredients.push(newIngredient);
      created++;
    }
  }

  return NextResponse.json({ created, updated, errors });
}
