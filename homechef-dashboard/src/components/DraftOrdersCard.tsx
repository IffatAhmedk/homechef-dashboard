"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createOrder } from "@/data/orders";
import { useMenu } from "@/data/menu";
import type { DraftOrder } from "@/lib/agent-tools";
import { formatCurrency, formatDateTime } from "@/lib/format";

/** A reviewable list of orders drafted from a WhatsApp export — nothing here is saved until confirmed. */
export function DraftOrdersCard({
  orders,
  unmatched,
  customerName,
  customerPhone,
}: {
  orders: DraftOrder[];
  unmatched: string[];
  customerName?: string;
  customerPhone?: string;
}) {
  const { data: menu = [] } = useMenu();
  const priceById = new Map(menu.map((m) => [m.id, m.price]));
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  function estimatedTotal(order: DraftOrder) {
    return order.items.reduce((sum, i) => sum + (i.menuItemId ? (priceById.get(i.menuItemId) ?? 0) * i.quantity : 0), 0);
  }

  async function confirm(index: number) {
    const order = orders[index];
    const items = order.items.filter((i) => i.menuItemId).map((i) => ({ menuItemId: i.menuItemId!, quantity: i.quantity }));
    if (items.length === 0) {
      setErrors((e) => ({ ...e, [index]: "No matched items to save" }));
      return;
    }
    setSaving(index);
    setErrors((e) => ({ ...e, [index]: "" }));
    const result = await createOrder({
      name: customerName || "WhatsApp customer",
      phone: customerPhone || undefined,
      status: "DELIVERED",
      discount: 0,
      deliveryCharge: 0,
      tip: 0,
      createdAt: order.requestedTime,
      notes: order.notes ?? undefined,
      items,
    });
    setSaving(null);
    if (result.ok) setSaved((s) => new Set(s).add(index));
    else setErrors((e) => ({ ...e, [index]: result.error ?? "Could not save" }));
  }

  async function confirmAll() {
    for (let i = 0; i < orders.length; i++) {
      if (!saved.has(i)) await confirm(i);
    }
  }

  if (orders.length === 0) {
    return <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">No orders found in that export.</p>;
  }

  return (
    <div className="space-y-2 rounded-lg bg-sunken p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label font-bold text-ink-muted">
          {orders.length} draft order{orders.length === 1 ? "" : "s"}
        </p>
        {saved.size < orders.length && (
          <Button size="sm" variant="secondary" onClick={confirmAll}>
            Confirm all
          </Button>
        )}
      </div>
      {unmatched.length > 0 && <p className="text-caption text-warn">Couldn&apos;t match on the menu: {unmatched.join(", ")}</p>}
      <ul className="space-y-2">
        {orders.map((order, i) => (
          <li key={i} className="rounded-lg bg-card p-3 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{formatDateTime(order.requestedTime)}</p>
                <p className="text-base text-ink-muted">
                  {order.items.map((it) => `${it.quantity} × ${it.menuItemName}${it.menuItemId ? "" : " (unmatched)"}`).join(", ")}
                </p>
                {order.notes && <p className="text-caption text-ink-muted">Note: {order.notes}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-ink">{formatCurrency(estimatedTotal(order))}</p>
                {saved.has(i) ? (
                  <span className="text-caption text-leaf">Saved</span>
                ) : (
                  <Button size="sm" disabled={saving === i} onClick={() => confirm(i)}>
                    {saving === i ? "Saving…" : "Confirm & save"}
                  </Button>
                )}
              </div>
            </div>
            {errors[i] && <p className="mt-1 text-caption text-danger">{errors[i]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
