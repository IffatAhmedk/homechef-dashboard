import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { PersonalExpenseCategory, PersonalExpenseEntry, RationItemEntry } from "@/models";
import { refresh, send } from "./http";

export function usePersonalExpenses(from?: string, to?: string) {
  const query = from && to ? `?from=${from}&to=${to}` : "";
  return useSWR<PersonalExpenseEntry[]>(`/api/personal-expenses${query}`, fetcher);
}

export async function addPersonalExpense(entry: { category: PersonalExpenseCategory; description: string; amount: number; date?: string }) {
  const result = await send("/api/personal-expenses", "POST", entry);
  if (result.ok) await refresh("/api/personal-expenses");
  return result;
}

export async function deletePersonalExpense(id: string) {
  const result = await send(`/api/personal-expenses/${id}`, "DELETE");
  if (result.ok) await refresh("/api/personal-expenses");
  return result;
}

export function useRationItems(from?: string, to?: string) {
  const query = from && to ? `?from=${from}&to=${to}` : "";
  return useSWR<RationItemEntry[]>(`/api/ration${query}`, fetcher);
}

export async function addRationItem(entry: { name: string; amount: number; date?: string }) {
  const result = await send("/api/ration", "POST", entry);
  if (result.ok) await refresh("/api/ration");
  return result;
}

export async function deleteRationItem(id: string) {
  const result = await send(`/api/ration/${id}`, "DELETE");
  if (result.ok) await refresh("/api/ration");
  return result;
}
