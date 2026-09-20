import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeItemCost } from "@/lib/recipe-cost";

interface ImportRow {
  menu_item: string;
  component_type: string;
  component_name: string;
  quantity: string | number;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const menuItems = await prisma.menuItem.findMany();
  const ingredients = await prisma.ingredient.findMany();
  const byMenuItemName = new Map(menuItems.map((m) => [m.name.toLowerCase(), m]));
  const byIngredientName = new Map(ingredients.map((i) => [i.name.toLowerCase(), i]));

  let created = 0;
  let updated = 0;
  const errors: { row: string; message: string }[] = [];
  const affectedItemIds = new Set<string>();

  for (const row of rows) {
    const menuItemName = (row.menu_item ?? "").trim();
    const componentType = (row.component_type ?? "").trim().toLowerCase();
    const componentName = (row.component_name ?? "").trim();
    const quantity = Number(row.quantity);

    const menuItem = byMenuItemName.get(menuItemName.toLowerCase());
    if (!menuItem) {
      errors.push({ row: menuItemName || "(blank)", message: `Menu item "${menuItemName}" not found` });
      continue;
    }
    if (!quantity || quantity <= 0) {
      errors.push({ row: menuItemName, message: "quantity must be greater than 0" });
      continue;
    }
    if (!["ingredient", "item"].includes(componentType)) {
      errors.push({ row: menuItemName, message: `component_type must be "ingredient" or "item"` });
      continue;
    }

    let ingredientId: string | null = null;
    let componentItemId: string | null = null;

    if (componentType === "ingredient") {
      const ingredient = byIngredientName.get(componentName.toLowerCase());
      if (!ingredient) {
        errors.push({ row: menuItemName, message: `Ingredient "${componentName}" not found` });
        continue;
      }
      ingredientId = ingredient.id;
    } else {
      const component = byMenuItemName.get(componentName.toLowerCase());
      if (!component) {
        errors.push({ row: menuItemName, message: `Menu item "${componentName}" not found` });
        continue;
      }
      if (component.id === menuItem.id) {
        errors.push({ row: menuItemName, message: "An item can't be an ingredient of itself" });
        continue;
      }
      componentItemId = component.id;
    }

    const existingLine = await prisma.recipeLine.findFirst({
      where: { menuItemId: menuItem.id, ingredientId, componentItemId },
    });

    if (existingLine) {
      await prisma.recipeLine.update({ where: { id: existingLine.id }, data: { quantity } });
      updated++;
    } else {
      await prisma.recipeLine.create({
        data: { menuItemId: menuItem.id, ingredientId, componentItemId, quantity },
      });
      created++;
    }
    affectedItemIds.add(menuItem.id);
  }

  // Each affected item gets its own top-level recompute (with a fresh cascade guard) so that a
  // combo depending on multiple just-updated items ends up with the correct final total, however
  // the rows happened to be ordered in the CSV.
  for (const id of affectedItemIds) {
    await recomputeItemCost(id);
  }

  return NextResponse.json({ created, updated, errors });
}
