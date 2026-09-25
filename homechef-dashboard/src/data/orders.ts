import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Customer, CustomerMatch, Order } from "@/models";
import { refresh, send } from "./http";

const refreshOrders = () => refresh("/api/orders", "/api/analytics", "/api/customers", "/api/menu", "/api/ingredients", "/api/invoices");

export function useOrders(from?: string, to?: string) {
  return useSWR<Order[]>(from && to ? `/api/orders?from=${from}&to=${to}` : "/api/orders", fetcher, { refreshInterval: 15000 });
}

export function useOrder(id: string | null) {
  return useSWR<Order>(id ? `/api/orders/${id}` : null, fetcher);
}

export function useCustomers() {
  return useSWR<Customer[]>("/api/customers", fetcher);
}

export interface OrderDetails {
  customerId?: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  channel?: "DIRECT" | "FOODPANDA";
  status: string;
  createdAt?: string;
  discount: number;
  deliveryCharge: number;
  tip: number;
  items: { menuItemId: string; quantity: number; price?: number }[];
}

export async function createOrder(order: OrderDetails) {
  const result = await send("/api/orders", "POST", order);
  if (result.ok) await refreshOrders();
  return result;
}

export async function updateOrder(id: string, order: OrderDetails) {
  const result = await send(`/api/orders/${id}`, "PATCH", order);
  if (result.ok) await refreshOrders();
  return result;
}

export async function setOrderStatus(id: string, status: string) {
  const result = await send(`/api/orders/${id}`, "PATCH", { status });
  if (result.ok) await refreshOrders();
  return result;
}

export async function findCustomers(query: string): Promise<CustomerMatch[]> {
  const res = await fetch(`/api/customers/lookup?q=${encodeURIComponent(query.trim())}`);
  return res.ok ? res.json() : [];
}

export async function importOrders<T = Record<string, unknown>>(kind: "csv" | "foodpanda-summary" | "foodpanda-invoices", body: unknown) {
  const url = { csv: "/api/orders/import", "foodpanda-summary": "/api/orders/import-foodpanda", "foodpanda-invoices": "/api/orders/import-foodpanda-invoice" }[kind];
  const result = await send<T>(url, "POST", body);
  if (result.ok) await refreshOrders();
  return result;
}
