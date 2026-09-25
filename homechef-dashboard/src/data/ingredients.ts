import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Ingredient, IngredientKind, StockEntryType, StockMovement } from "@/models";
import { refresh, send } from "./http";

const refreshIngredients = () => refresh("/api/ingredients", "/api/menu", "/api/analytics");

export function useIngredients() {
  return useSWR<Ingredient[]>("/api/ingredients", fetcher);
}

export function useStockHistory(ingredientId: string) {
  return useSWR<StockMovement[]>(`/api/ingredients/${ingredientId}/stock`, fetcher);
}

interface NewIngredient {
  name: string;
  unit: string;
  category: IngredientKind;
  /** What you bought, in the ingredient's own unit. */
  purchase: { quantity: number; totalCost: number; date: string };
}

export async function addIngredient(ingredient: NewIngredient) {
  const result = await send("/api/ingredients", "POST", ingredient);
  if (result.ok) await refreshIngredients();
  return result;
}

export async function updateIngredient(id: string, changes: Partial<Pick<Ingredient, "name" | "unit" | "category" | "costPerUnit">>) {
  const result = await send(`/api/ingredients/${id}`, "PATCH", changes);
  if (result.ok) await refreshIngredients();
  return result;
}

export async function deleteIngredient(id: string) {
  const result = await send(`/api/ingredients/${id}`, "DELETE");
  if (result.ok) await refreshIngredients();
  return result;
}

interface StockEntry {
  type: StockEntryType;
  quantity: number;
  totalCost?: number;
  unitCost?: number;
  date?: string;
  note?: string;
}

export async function logStock(ingredientId: string, entry: StockEntry) {
  const result = await send(`/api/ingredients/${ingredientId}/stock`, "POST", entry);
  if (result.ok) await refreshIngredients();
  return result;
}

export async function removeStockEntry(ingredientId: string, movementId: string) {
  const result = await send(`/api/ingredients/${ingredientId}/stock?movementId=${movementId}`, "DELETE");
  if (result.ok) await refreshIngredients();
  return result;
}

export interface ImportSummary {
  created: number;
  updated: number;
  errors: { row: string; message: string }[];
}

export async function importIngredients(rows: unknown[]) {
  const result = await send<ImportSummary>("/api/ingredients/import", "POST", { rows });
  if (result.ok) await refreshIngredients();
  return result;
}
