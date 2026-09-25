"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { setOrderStatus } from "@/data/orders";
import { formatCurrency, formatDateTime, STATUS_FLOW, STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/models";

function nextStatus(status: string) {
  const i = STATUS_FLOW.indexOf(status);
  return i === -1 || i === STATUS_FLOW.length - 1 ? null : STATUS_FLOW[i + 1];
}

/** Orders as a kitchen list: move each one along (Confirmed → Preparing → …) or cancel it. Click an order for its items. */
export function OrderWorkflowList({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function move(order: Order, status: string) {
    setBusy(order.id);
    await setOrderStatus(order.id, status);
    setBusy(null);
  }

  if (orders.length === 0) return <p className="rounded-lg bg-card p-6 text-center text-base text-ink-muted shadow-card">No orders here.</p>;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg bg-card shadow-card">
      {orders.map((order) => {
        const next = nextStatus(order.status);
        const isOpen = expanded === order.id;
        const isFinished = order.status === "DELIVERED" || order.status === "CANCELLED";
        return (
          <li key={order.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="text-left" onClick={() => setExpanded(isOpen ? null : order.id)}>
                <p className="font-bold text-ink">
                  #{order.id.slice(-8).toUpperCase()} · {order.customer.name}
                </p>
                <p className="text-caption text-ink-muted">
                  {order.customer.phone} · {formatDateTime(order.createdAt)}
                </p>
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <OrderStatusBadge order={order} />
                <span className="font-bold text-ink">{formatCurrency(order.totalAmount)}</span>
                {next && (
                  <Button size="sm" disabled={busy === order.id} onClick={() => move(order, next)}>
                    Mark {STATUS_LABELS[next]}
                  </Button>
                )}
                {!isFinished && (
                  <Button variant="destructive" size="sm" disabled={busy === order.id} onClick={() => move(order, "CANCELLED")}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="mt-3 space-y-2 rounded-lg bg-sunken p-3 text-base">
                {order.deliveryAddress && <p className="text-ink-muted">Deliver to: {order.deliveryAddress}</p>}
                {order.notes && <p className="text-ink-muted">Note: {order.notes}</p>}
                <ul className="space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-ink-muted">
                      <span>
                        {item.quantity} × {item.menuItem.name}
                      </span>
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
  );
}
