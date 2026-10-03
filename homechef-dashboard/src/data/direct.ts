import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface DirectSummary {
  sales: number;
  cost: number;
  orderCount: number;
  bestSellers: { menuItemId: string; name: string; quantity: number; sales: number }[];
  orders: { id: string; createdAt: string; status: string; customerName: string; itemCount: number; total: number }[];
}

export function useDirect(from: string, to: string) {
  return useSWR<DirectSummary>(`/api/direct?from=${from}&to=${to}`, fetcher, { refreshInterval: 15000 });
}
