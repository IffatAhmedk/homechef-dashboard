import type { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeItemsUsingIngredient } from "@/lib/recipe-cost";

type Db = Prisma.TransactionClient | typeof prisma;

const DAY_MS = 86_400_000;
const USAGE_WINDOW_DAYS = 14;

export interface IngredientStock {
  stockQty: number;
  tracked: boolean;
  trackedSince: Date | null;
  avgDailyUse: number;
  daysLeft: number | null;
}

/** Stock on hand, tracking status and recent usage pace for every ingredient. */
export async function ingredientStockLevels(db: Db = prisma): Promise<Map<string, IngredientStock>> {
  const since = new Date(Date.now() - USAGE_WINDOW_DAYS * DAY_MS);
  const [totals, starts, usage] = await Promise.all([
    db.stockMovement.groupBy({ by: ["ingredientId"], _sum: { quantity: true } }),
    db.stockMovement.groupBy({
      by: ["ingredientId"],
      where: { type: { in: ["OPENING", "PURCHASE"] } },
      _min: { date: true },
    }),
    db.stockMovement.groupBy({
      by: ["ingredientId"],
      where: { type: { in: ["SALE", "WASTAGE"] }, date: { gte: since } },
      _sum: { quantity: true },
    }),
  ]);
  const startBy = new Map(starts.map((s) => [s.ingredientId, s._min.date]));
  const usageBy = new Map(usage.map((u) => [u.ingredientId, -(u._sum.quantity ?? 0)]));

  const result = new Map<string, IngredientStock>();
  for (const t of totals) {
    const stockQty = Math.round((t._sum.quantity ?? 0) * 1000) / 1000;
    const start = startBy.get(t.ingredientId) ?? null;
    const windowDays = start ? Math.min(USAGE_WINDOW_DAYS, Math.max(1, (Date.now() - start.getTime()) / DAY_MS)) : USAGE_WINDOW_DAYS;
    const used = usageBy.get(t.ingredientId) ?? 0;
    const avgDailyUse = used / windowDays;
    result.set(t.ingredientId, {
      stockQty,
      tracked: start != null,
      trackedSince: start,
      avgDailyUse,
      daysLeft: avgDailyUse > 0 ? Math.max(0, stockQty) / avgDailyUse : null,
    });
  }
  return result;
}

export interface StockEntry {
  type: "PURCHASE" | "COUNT" | "WASTAGE";
  quantity: number;
  /** Total paid for a purchase. */
  totalCost?: number;
  /** For a first-time count: the price per unit, if the ingredient has none yet. */
  unitCost?: number;
  date?: Date;
  note?: string;
}

type Ingredient = { id: string; costPerUnit: number };

interface EntryOutcome {
  /** The recipe cost of every item using this ingredient needs recalculating. */
  priceChanged: boolean;
  /** Stock is now tracked from earlier than before — orders since then need their ledger entries rebuilt. */
  backfillFrom: Date | null;
}

/** A purchase: logs it, and folds the price paid into a stock-weighted average cost. */
async function recordPurchase(tx: Db, ingredient: Ingredient, entry: StockEntry, current: number, trackedSince: Date | null): Promise<EntryOutcome> {
  if (!(entry.quantity > 0)) throw new Error("Quantity bought must be above 0");
  if (!(entry.totalCost != null && entry.totalCost > 0)) throw new Error("Enter how much you paid");
  const date = entry.date ?? new Date();
  const unitCost = entry.totalCost / entry.quantity;
  const onHand = Math.max(0, current);
  const blended = onHand > 0 ? (onHand * ingredient.costPerUnit + entry.quantity * unitCost) / (onHand + entry.quantity) : unitCost;

  await tx.stockMovement.create({
    data: { ingredientId: ingredient.id, type: "PURCHASE", quantity: entry.quantity, unitCost, date, note: entry.note?.trim() || null },
  });
  await tx.ingredient.update({ where: { id: ingredient.id }, data: { costPerUnit: Math.round(blended * 10000) / 10000 } });

  return { priceChanged: true, backfillFrom: !trackedSince || date < trackedSince ? date : null };
}

/** Spoilage or loss: only allowed once stock is tracked, since there's nothing to subtract from otherwise. */
async function recordWastage(tx: Db, ingredient: Ingredient, entry: StockEntry, tracked: boolean): Promise<EntryOutcome> {
  if (!(entry.quantity > 0)) throw new Error("Quantity wasted must be above 0");
  if (!tracked) throw new Error("Set the stock you have first, then you can log wastage");

  await tx.stockMovement.create({
    data: {
      ingredientId: ingredient.id,
      type: "WASTAGE",
      quantity: -entry.quantity,
      unitCost: ingredient.costPerUnit,
      date: entry.date ?? new Date(),
      note: entry.note?.trim() || null,
    },
  });
  return { priceChanged: false, backfillFrom: null };
}

/** A count: the first one starts tracking (optionally setting the price); later ones correct for drift. */
async function recordCount(tx: Db, ingredient: Ingredient, entry: StockEntry, current: number, tracked: boolean): Promise<EntryOutcome> {
  if (!(entry.quantity >= 0)) throw new Error("Counted quantity can't be negative");
  const date = entry.date ?? new Date();
  const note = entry.note?.trim() || null;

  if (!tracked) {
    await tx.stockMovement.create({
      data: { ingredientId: ingredient.id, type: "OPENING", quantity: entry.quantity, unitCost: entry.unitCost ?? null, date, note },
    });
    const setsPrice = !!entry.unitCost && entry.unitCost > 0 && ingredient.costPerUnit === 0;
    if (setsPrice) await tx.ingredient.update({ where: { id: ingredient.id }, data: { costPerUnit: entry.unitCost! } });
    return { priceChanged: setsPrice, backfillFrom: null };
  }

  const delta = Math.round((entry.quantity - current) * 1000) / 1000;
  if (delta !== 0) {
    await tx.stockMovement.create({
      data: { ingredientId: ingredient.id, type: "ADJUSTMENT", quantity: delta, unitCost: ingredient.costPerUnit, date, note: note ?? "Stock count" },
    });
  }
  return { priceChanged: false, backfillFrom: null };
}

/** Rebuilds every order on/after `from`, so a late-logged purchase is reflected in what they used. */
async function backfillOrdersSince(from: Date) {
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: from } }, select: { id: true } });
  await syncOrdersStock(prisma, orders.map((o) => o.id));
}

/** Records a manual stock event and, for purchases, folds the new price into a stock-weighted average. */
export async function recordStockEntry(ingredientId: string, entry: StockEntry) {
  const outcome = await prisma.$transaction(
    async (tx) => {
      const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (!ingredient) throw new Error("Ingredient not found");
      const level = (await ingredientStockLevels(tx)).get(ingredientId);
      const current = level?.stockQty ?? 0;
      const tracked = level?.tracked ?? false;

      if (entry.type === "PURCHASE") return recordPurchase(tx, ingredient, entry, current, level?.trackedSince ?? null);
      if (entry.type === "WASTAGE") return recordWastage(tx, ingredient, entry, tracked);
      return recordCount(tx, ingredient, entry, current, tracked);
    },
    { maxWait: 10_000, timeout: 20_000 }
  );

  if (outcome.priceChanged) await recomputeItemsUsingIngredient(ingredientId);
  if (outcome.backfillFrom) await backfillOrdersSince(outcome.backfillFrom);
}

interface RecipeNode {
  yield: number;
  lines: { ingredientId: string | null; componentItemId: string | null; quantity: number }[];
}

/** How much of each ingredient one serving of each menu item uses, following combos/deals down to ingredients. */
function ingredientsFor(nodes: Map<string, RecipeNode>, itemId: string, servings: number, into: Map<string, number>, depth = 0) {
  const node = nodes.get(itemId);
  if (!node || depth > 10) return;
  for (const line of node.lines) {
    const amount = (servings * line.quantity) / node.yield;
    if (line.ingredientId) into.set(line.ingredientId, (into.get(line.ingredientId) ?? 0) + amount);
    else if (line.componentItemId) ingredientsFor(nodes, line.componentItemId, amount, into, depth + 1);
  }
}

/**
 * Rebuilds the stock movements caused by these orders from their current items and status: a sale
 * normally, wastage for a cancelled Foodpanda order (food was already made), nothing for other
 * cancellations. Safe to call again whenever an order changes.
 *
 * The cost is locked in the first time an order's ingredients are recorded, at whatever the
 * ingredient's price was then — later calls (a status change, an unrelated invoice refresh, editing
 * a different order) never revalue an order whose ingredients and quantities haven't actually
 * changed. Only a genuine change to the items themselves reprices it, at today's prices. Marking an
 * order cancelled (sale → wastage) or restoring it keeps the original locked cost. Ingredients are
 * only touched once their stock is being tracked (an opening count or purchase dated on/before the
 * order).
 */
interface OrderForSync {
  id: string;
  createdAt: Date;
  status: string;
  channel: string;
  items: { menuItemId: string; quantity: number }[];
}

type PriorMovements = Map<string, Map<string, { quantity: number; type: StockMovementType }>>;

/** Groups each order's existing SALE/WASTAGE rows by ingredient, to compare against what they need now. */
function groupExistingByOrder(movements: { orderId: string | null; ingredientId: string; quantity: number; type: StockMovementType }[]): PriorMovements {
  const byOrder: PriorMovements = new Map();
  for (const m of movements) {
    if (!m.orderId) continue;
    const forOrder = byOrder.get(m.orderId) ?? new Map();
    forOrder.set(m.ingredientId, { quantity: m.quantity, type: m.type });
    byOrder.set(m.orderId, forOrder);
  }
  return byOrder;
}

interface Classification {
  /** Orders whose ledger rows should be removed outright (nothing consumed any more). */
  toClear: string[];
  /** Orders where only sale↔wastage needs flipping — the locked cost doesn't change. */
  toFlip: { orderId: string; type: StockMovementType }[];
  /** Orders whose ingredients/quantities genuinely changed and need fresh, repriced rows. */
  toReprice: string[];
  perOrder: Map<string, Map<string, number>>;
  allIngredientIds: Set<string>;
}

/** Decides, per order, whether its ledger entries can stay untouched, just need their type flipped, should be cleared, or must be rebuilt at today's prices. */
function classifyOrders(orders: OrderForSync[], nodes: Map<string, RecipeNode>, existingByOrder: PriorMovements): Classification {
  const perOrder = new Map<string, Map<string, number>>();
  const allIngredientIds = new Set<string>();
  const toClear: string[] = [];
  const toFlip: { orderId: string; type: StockMovementType }[] = [];
  const toReprice: string[] = [];

  for (const order of orders) {
    const isWastageOnly = order.status === "CANCELLED" && order.channel !== "FOODPANDA";
    const needs = new Map<string, number>();
    if (!isWastageOnly) {
      for (const item of order.items) ingredientsFor(nodes, item.menuItemId, item.quantity, needs);
    }
    const type: StockMovementType = order.status === "CANCELLED" ? "WASTAGE" : "SALE";
    const prior = existingByOrder.get(order.id) ?? new Map();

    if (needs.size === 0) {
      if (prior.size > 0) toClear.push(order.id);
      continue;
    }

    const sameIngredients =
      needs.size === prior.size &&
      [...needs].every(([ingredientId, amount]) => {
        const p = prior.get(ingredientId);
        return p && Math.abs(p.quantity - -Math.round(amount * 1000) / 1000) < 1e-6;
      });

    if (sameIngredients) {
      if ([...prior.values()].some((p) => p.type !== type)) toFlip.push({ orderId: order.id, type });
      continue; // Same physical consumption — keep whatever cost was locked in the first time.
    }

    toReprice.push(order.id);
    perOrder.set(order.id, needs);
    needs.forEach((_, id) => allIngredientIds.add(id));
  }

  return { toClear, toFlip, toReprice, perOrder, allIngredientIds };
}

/** Clears stale rows and flips sale↔wastage for orders whose consumption didn't actually change. */
function applyClearsAndFlips(db: Db, toClear: string[], toFlip: Classification["toFlip"]) {
  return Promise.all([
    toClear.length > 0 ? db.stockMovement.deleteMany({ where: { orderId: { in: toClear } } }) : Promise.resolve(),
    ...toFlip.map((f) => db.stockMovement.updateMany({ where: { orderId: f.orderId }, data: { type: f.type } })),
  ]);
}

/** Writes fresh SALE/WASTAGE rows for the orders that need repricing, valued at each ingredient's current price. */
async function repriceOrders(db: Db, orders: OrderForSync[], toReprice: string[], perOrder: Classification["perOrder"], allIngredientIds: Set<string>) {
  if (toReprice.length === 0) return;
  await db.stockMovement.deleteMany({ where: { orderId: { in: toReprice } } });
  if (allIngredientIds.size === 0) return;

  const ids = [...allIngredientIds];
  const [ingredients, starts] = await Promise.all([
    db.ingredient.findMany({ where: { id: { in: ids } }, select: { id: true, costPerUnit: true } }),
    db.stockMovement.groupBy({
      by: ["ingredientId"],
      where: { ingredientId: { in: ids }, type: { in: ["OPENING", "PURCHASE"] } },
      _min: { date: true },
    }),
  ]);
  const costBy = new Map(ingredients.map((i) => [i.id, i.costPerUnit]));
  const startBy = new Map(starts.map((s) => [s.ingredientId, s._min.date]));

  const rows: Prisma.StockMovementCreateManyInput[] = [];
  for (const order of orders) {
    const needs = perOrder.get(order.id);
    if (!needs) continue;
    for (const [ingredientId, amount] of needs) {
      const start = startBy.get(ingredientId);
      if (!start || start > order.createdAt) continue;
      rows.push({
        ingredientId,
        type: order.status === "CANCELLED" ? "WASTAGE" : "SALE",
        quantity: -Math.round(amount * 1000) / 1000,
        unitCost: costBy.get(ingredientId) ?? 0,
        orderId: order.id,
        date: order.createdAt,
      });
    }
  }
  if (rows.length > 0) await db.stockMovement.createMany({ data: rows });
}

export async function syncOrdersStock(db: Db, orderIds: string[]) {
  if (orderIds.length === 0) return;

  const [orders, menuItems, existingMovements] = await Promise.all([
    db.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, createdAt: true, status: true, channel: true, items: { select: { menuItemId: true, quantity: true } } },
    }),
    db.menuItem.findMany({
      select: { id: true, batchYield: true, recipeLines: { select: { ingredientId: true, componentItemId: true, quantity: true } } },
    }),
    db.stockMovement.findMany({
      where: { orderId: { in: orderIds }, type: { in: ["SALE", "WASTAGE"] } },
      select: { orderId: true, ingredientId: true, quantity: true, type: true },
    }),
  ]);
  const nodes = new Map(menuItems.map((m) => [m.id, { yield: m.batchYield > 0 ? m.batchYield : 1, lines: m.recipeLines }]));
  const existingByOrder = groupExistingByOrder(existingMovements);

  const { toClear, toFlip, toReprice, perOrder, allIngredientIds } = classifyOrders(orders, nodes, existingByOrder);
  await applyClearsAndFlips(db, toClear, toFlip);
  await repriceOrders(db, orders, toReprice, perOrder, allIngredientIds);
}

export function syncOrderStock(db: Db, orderId: string) {
  return syncOrdersStock(db, [orderId]);
}
