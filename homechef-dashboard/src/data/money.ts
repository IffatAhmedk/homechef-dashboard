import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Expense, Invoice } from "@/models";
import { refresh, send } from "./http";

export function useInvoices() {
  return useSWR<Invoice[]>("/api/invoices", fetcher);
}

interface InvoiceChanges {
  actualBankDeposit: number | null;
  paymentDate: string | null;
  pendingAmount: number | null;
  disputedAmount: number | null;
}

export async function saveInvoice(id: string, changes: InvoiceChanges) {
  const result = await send(`/api/invoices/${id}`, "PATCH", changes);
  if (result.ok) await refresh("/api/invoices");
  return result;
}

export function useExpenses(from: string, to: string) {
  return useSWR<Expense[]>(`/api/expenses?from=${from}&to=${to}`, fetcher);
}

export async function addExpense(expense: { description: string; amount: number; category: string }) {
  const result = await send("/api/expenses", "POST", expense);
  if (result.ok) await refresh("/api/expenses", "/api/analytics");
  return result;
}

export async function deleteExpense(id: string) {
  const result = await send(`/api/expenses/${id}`, "DELETE");
  if (result.ok) await refresh("/api/expenses", "/api/analytics");
  return result;
}
