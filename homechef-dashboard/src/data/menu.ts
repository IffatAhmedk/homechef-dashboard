import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Category, MenuItem, RecipeLine } from "@/models";
import { refresh, send } from "./http";
import type { ImportSummary } from "./ingredients";

const refreshMenu = () => refresh("/api/menu", "/api/analytics", "/api/ingredients");

export function useMenu() {
  return useSWR<MenuItem[]>("/api/menu", fetcher);
}

export function useCategories() {
  return useSWR<Category[]>("/api/categories", fetcher);
}

export function useRecipe(menuItemId: string) {
  return useSWR<RecipeLine[]>(`/api/menu/${menuItemId}/recipe`, fetcher, { revalidateOnFocus: false });
}

/** The lines of one menu item's recipe (for a deal: the items inside it). */
export async function getRecipe(menuItemId: string): Promise<RecipeLine[]> {
  const res = await fetch(`/api/menu/${menuItemId}/recipe`);
  return res.ok ? res.json() : [];
}

/** Finds a category by name (any capitalisation) or creates it. Returns its id, or null if it couldn't be created. */
export async function findOrCreateCategory(name: string, existing: Category[]) {
  const trimmed = name.trim();
  const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  const created = await send<Category>("/api/categories", "POST", { name: trimmed, sortOrder: existing.length });
  if (!created.ok) return null;
  await refresh("/api/categories");
  return created.data.id;
}

interface NewMenuItem {
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  stockQty: number;
  categoryId: string;
}

export async function createMenuItem(item: NewMenuItem) {
  const result = await send("/api/menu", "POST", item);
  if (result.ok) await refreshMenu();
  return result;
}

export interface DealDetails {
  name: string;
  description?: string | null;
  price: number;
  categoryId: string;
  /** Only used when some items inside the deal have no cost yet. */
  costPrice?: number;
  components: { menuItemId: string; quantity: number }[];
}

export async function createDeal(deal: DealDetails) {
  const result = await send("/api/menu", "POST", { ...deal, isDeal: true });
  if (result.ok) await refreshMenu();
  return result;
}

export async function updateMenuItem(id: string, changes: Partial<DealDetails> & Partial<Pick<MenuItem, "isAvailable" | "stockQty">>) {
  const result = await send(`/api/menu/${id}`, "PATCH", changes);
  if (result.ok) await refreshMenu();
  return result;
}

/** On failure, result.data.reason is "orders" (on past orders) or "in-use" (inside a deal). */
export async function deleteMenuItem(id: string) {
  const result = await send<{ reason?: string }>(`/api/menu/${id}`, "DELETE");
  if (result.ok) await refreshMenu();
  return result;
}

export async function saveRecipe(menuItemId: string, recipe: { batchYield: number; lines: { ingredientId: string; quantity: number }[] }) {
  const result = await send(`/api/menu/${menuItemId}/recipe`, "PUT", recipe);
  if (result.ok) await Promise.all([refreshMenu(), refresh(`/api/menu/${menuItemId}/recipe`)]);
  return result;
}

export async function importMenuItems(rows: unknown[]) {
  const result = await send<ImportSummary>("/api/menu/import", "POST", { rows });
  if (result.ok) await refreshMenu();
  return result;
}

export async function importRecipes(rows: unknown[]) {
  const result = await send<ImportSummary>("/api/menu/recipes-import", "POST", { rows });
  if (result.ok) await refreshMenu();
  return result;
}
