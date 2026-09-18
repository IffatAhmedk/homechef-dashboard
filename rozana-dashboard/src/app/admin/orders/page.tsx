"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_COLORS, STATUS_FLOW } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";

interface OrderItem {
  id: string;
  quantity: number;
  priceAtSale: number;
  menuItem: { id: string; name: string };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string };
  items: OrderItem[];
}

const FILTERS = ["ALL", ...STATUS_FLOW, "CANCELLED"];

export default function AdminOrdersPage() {
  const { data: orders = [] } = useSWR<Order[]>("/api/orders", fetcher, { refreshInterval: 15000 });
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "ALL" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await mutate("/api/orders");
    setUpdating(null);
  }

  function nextStatus(status: string) {
    const idx = STATUS_FLOW.indexOf(status);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Orders</h1>
        <p className="text-sm text-neutral-500">Kitchen & delivery workflow — move orders through their status.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {f === "ALL" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-neutral-400">No orders here.</p>}
        <ul className="divide-y divide-neutral-100">
          {filtered.map((order) => {
            const next = nextStatus(order.status);
            const isExpanded = expanded === order.id;
            return (
              <li key={order.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="text-left"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                  >
                    <p className="font-medium text-neutral-900">
                      #{order.id.slice(-8).toUpperCase()} · {order.customer.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {order.customer.phone} · {formatDateTime(order.createdAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-semibold text-neutral-900">{formatCurrency(order.totalAmount)}</span>
                    {next && (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        disabled={updating === order.id}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        Mark {STATUS_LABELS[next]}
                      </button>
                    )}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateStatus(order.id, "CANCELLED")}
                        disabled={updating === order.id}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
                    <p className="mb-2 text-neutral-600">Deliver to: {order.deliveryAddress}</p>
                    {order.notes && <p className="mb-2 text-neutral-600">Note: {order.notes}</p>}
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between text-neutral-700">
                          <span>{item.quantity} × {item.menuItem.name}</span>
                          <span>{formatCurrency(item.priceAtSale * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
