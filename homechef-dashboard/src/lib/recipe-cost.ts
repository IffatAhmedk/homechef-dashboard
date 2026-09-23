import { prisma } from "@/lib/prisma";

/**
 * Recomputes and stores a menu item's costPrice from its recipe lines
 * (ingredients and/or other menu items used as combo components), then
 * cascades to any items that use this one as a combo component.
 *
 * The cost is only taken over from the recipe ("auto") when a recipe exists AND every line has a
 * price to work from; otherwise the manually entered costPrice is left alone. The result is stored
 * in MenuItem.costIsAuto so clients never have to work it out themselves.
 */
export async function recomputeItemCost(menuItemId: string, visited: Set<string> = new Set()): Promise<void> {
  if (visited.has(menuItemId)) return;
  visited.add(menuItemId);

  const [lines, menuItem] = await Promise.all([
    prisma.recipeLine.findMany({
      where: { menuItemId },
      include: { ingredient: true, componentItem: true },
    }),
    prisma.menuItem.findUnique({ where: { id: menuItemId }, select: { batchYield: true } }),
  ]);

  if (lines.length === 0) {
    await prisma.menuItem.update({ where: { id: menuItemId }, data: { costIsAuto: false } });
    return;
  }

  const allPriced = lines.every((l) =>
    l.ingredient ? l.ingredient.costPerUnit > 0 : l.componentItem ? l.componentItem.costPrice > 0 : false
  );

  let batchCost = 0;
  let batchPackagingCost = 0;

  for (const line of lines) {
    if (line.ingredient) {
      const lineCost = line.quantity * line.ingredient.costPerUnit;
      batchCost += lineCost;
      if (line.ingredient.category === "PACKAGING") batchPackagingCost += lineCost;
    } else if (line.componentItem) {
      batchCost += line.quantity * line.componentItem.costPrice;
      batchPackagingCost += line.quantity * line.componentItem.packagingCostPrice;
    }
  }

  const batchYield = menuItem?.batchYield && menuItem.batchYield > 0 ? menuItem.batchYield : 1;
  const cost = batchCost / batchYield;
  const packagingCost = batchPackagingCost / batchYield;

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: allPriced
      ? {
          costPrice: Math.round(cost * 100) / 100,
          packagingCostPrice: Math.round(packagingCost * 100) / 100,
          costIsAuto: true,
        }
      : { costIsAuto: false },
  });

  const dependents = await prisma.recipeLine.findMany({
    where: { componentItemId: menuItemId },
    select: { menuItemId: true },
  });

  for (const dep of dependents) {
    await recomputeItemCost(dep.menuItemId, visited);
  }
}

/** Recomputes every menu item that references this ingredient in its recipe. */
export async function recomputeItemsUsingIngredient(ingredientId: string): Promise<void> {
  const lines = await prisma.recipeLine.findMany({
    where: { ingredientId },
    select: { menuItemId: true },
  });
  // Each top-level trigger gets its own visited set — the guard is only meant to stop
  // cycles within a single cascade chain, not suppress legitimate re-visits when a combo
  // depends on more than one item recomputed in this same batch.
  for (const line of lines) {
    await recomputeItemCost(line.menuItemId);
  }
}

/** Recomputes every menu item that uses this item as a combo component (e.g. after its price changes manually). */
export async function recomputeItemsUsingComponent(componentItemId: string): Promise<void> {
  const lines = await prisma.recipeLine.findMany({
    where: { componentItemId },
    select: { menuItemId: true },
  });
  for (const line of lines) {
    await recomputeItemCost(line.menuItemId);
  }
}
