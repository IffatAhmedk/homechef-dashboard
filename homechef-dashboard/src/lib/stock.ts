import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

interface StockNode {
  id: string;
  name: string;
  isDeal: boolean;
  stockQty: number;
  components: { id: string; quantity: number }[];
}

async function loadNodes(db: Db): Promise<Map<string, StockNode>> {
  const items = await db.menuItem.findMany({
    select: {
      id: true,
      name: true,
      isDeal: true,
      stockQty: true,
      recipeLines: { where: { componentItemId: { not: null } }, select: { componentItemId: true, quantity: true } },
    },
  });
  return new Map(
    items.map((i) => [
      i.id,
      {
        id: i.id,
        name: i.name,
        isDeal: i.isDeal,
        stockQty: i.stockQty,
        components: i.recipeLines.map((l) => ({ id: l.componentItemId!, quantity: l.quantity })),
      },
    ])
  );
}

function expand(nodes: Map<string, StockNode>, id: string, qty: number, into: Map<string, number>, depth = 0) {
  const node = nodes.get(id);
  if (!node || depth > 10) return;
  if (!node.isDeal) {
    into.set(id, (into.get(id) ?? 0) + qty);
    return;
  }
  for (const c of node.components) expand(nodes, c.id, qty * c.quantity, into, depth + 1);
}

/** Base (non-deal) items and quantities that selling these lines consumes — deals expand into their components. */
export async function baseRequirements(
  db: Db,
  lines: { menuItemId: string; quantity: number }[]
): Promise<Map<string, number>> {
  const nodes = await loadNodes(db);
  const need = new Map<string, number>();
  for (const line of lines) expand(nodes, line.menuItemId, line.quantity, need);
  return need;
}

/** Throws if any base item can't cover the requirement; names the deal that needs it when relevant. */
export async function assertStockCovers(db: Db, need: Map<string, number>) {
  const items = await db.menuItem.findMany({ where: { id: { in: [...need.keys()] } }, select: { id: true, name: true, stockQty: true } });
  for (const item of items) {
    if (item.stockQty < (need.get(item.id) ?? 0)) throw new Error(`Not enough stock for ${item.name}`);
  }
}

export async function applyStockDelta(db: Db, need: Map<string, number>, direction: "take" | "restore") {
  for (const [id, qty] of need) {
    await db.menuItem.update({
      where: { id },
      data: { stockQty: direction === "take" ? { decrement: qty } : { increment: qty } },
    });
  }
}

/** How many of each item can be made/sold right now: its own stock, or for deals the scarcest component. */
export async function availableQuantities(db: Db = prisma): Promise<Map<string, number>> {
  const nodes = await loadNodes(db);
  const memo = new Map<string, number>();
  const calc = (id: string, depth = 0): number => {
    const node = nodes.get(id);
    if (!node) return 0;
    if (!node.isDeal) return node.stockQty;
    if (memo.has(id)) return memo.get(id)!;
    if (depth > 10 || node.components.length === 0) return 0;
    const qty = Math.min(...node.components.map((c) => Math.floor(calc(c.id, depth + 1) / c.quantity)));
    memo.set(id, Math.max(0, qty));
    return memo.get(id)!;
  };
  return new Map([...nodes.keys()].map((id) => [id, calc(id)]));
}
