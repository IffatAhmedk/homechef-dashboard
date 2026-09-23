"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus } from "lucide-react";
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_COLORS, STATUS_FLOW } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import AddOrderModal from "../add-order-modal";

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
  const [showAddOrder, setShowAddOrder] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-ink">Orders</h1>
          <p className="text-sm text-ink-muted">Kitchen & delivery workflow — move orders through their status.</p>
        </div>
        <button
          onClick={() => setShowAddOrder(true)}
          className="flex items-center gap-1.5 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90"
        >
          <Plus size={16} /> Add order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-pill border px-3 py-1 text-xs font-bold ${
              filter === f
                ? "border-brand bg-brand text-on-brand"
                : "border-line bg-card text-ink-muted hover:bg-sunken"
            }`}
          >
            {f === "ALL" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-card">
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No orders here.</p>}
        <ul className="divide-y divide-line">
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
                    <p className="font-bold text-ink">
                      #{order.id.slice(-8).toUpperCase()} · {order.customer.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {order.customer.phone} · {formatDateTime(order.createdAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-pill border px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-bold text-ink">{formatCurrency(order.totalAmount)}</span>
                    {next && (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        disabled={updating === order.id}
                        className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
                      >
                        Mark {STATUS_LABELS[next]}
                      </button>
                    )}
                    {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                      <button
                        onClick={() => updateStatus(order.id, "CANCELLED")}
                        disabled={updating === order.id}
                        className="text-xs text-danger hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 rounded-lg bg-sunken p-3 text-sm">
                    <p className="mb-2 text-ink-muted">Deliver to: {order.deliveryAddress}</p>
                    {order.notes && <p className="mb-2 text-ink-muted">Note: {order.notes}</p>}
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between text-ink-muted">
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
      {showAddOrder && <AddOrderModal onClose={() => setShowAddOrder(false)} />}
    </div>
  );
}
