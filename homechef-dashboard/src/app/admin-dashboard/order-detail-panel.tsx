"use client";

import { useState } from "react";
import useSWR from "swr";
import { X, Pencil } from "lucide-react";
import AddOrderModal from "./add-order-modal";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_COLORS } from "@/lib/format";
import { itemFinancials, orderFinancials, FOODPANDA_COMMISSION_RATE } from "@/lib/finance";

interface OrderDetail {
  id: string;
  channel: "DIRECT" | "FOODPANDA";
  status: string;
  totalAmount: number;
  discount?: number;
  deliveryCharge?: number;
  tip?: number;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  costOverride: number | null;
  platformCutOverride: number | null;
  externalId: string | null;
  invoiceId?: string | null;
  customer: { name: string; phone: string };
  items: {
    id: string;
    menuItemId: string;
    quantity: number;
    priceAtSale: number;
    costAtSale: number;
    menuItem: { name: string };
  }[];
}

export default function OrderDetailPanel({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order } = useSWR<OrderDetail>(orderId ? `/api/orders/${orderId}` : null, fetcher);
  const [editing, setEditing] = useState(false);

  if (!orderId) return null;

  const fin = order ? orderFinancials(order) : null;

  return (
    <>
    {editing && order && <AddOrderModal editOrder={order} onClose={() => setEditing(false)} />}
    <div className="fixed inset-0 z-20 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Order detail</h2>
          <div className="flex items-center gap-1">
            {order?.channel === "DIRECT" && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-pill px-5 text-label text-brand hover:bg-sunken"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
          </div>
        </div>

        {!order ? (
          <p className="p-5 text-sm text-ink-muted">Loading…</p>
        ) : (
          <div className="flex-1 p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-bold text-ink">{order.customer.name}</p>
                <p className="text-sm text-ink-muted">{order.customer.phone}</p>
                <p className="text-xs text-ink-muted">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-pill px-2 py-0.5 text-xs font-bold ${
                    order.channel === "FOODPANDA" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
                  }`}
                >
                  {order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}
                </span>
                <span className={`rounded-pill border px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>

            <p className="mb-4 text-sm text-ink-muted">Deliver to: {order.deliveryAddress}</p>

            {order.items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-sunken text-left text-xs text-ink-muted">
                      <th className="px-3 py-2 font-bold">Item</th>
                      <th className="px-3 py-2 text-right font-bold">Price</th>
                      <th className="px-3 py-2 text-right font-bold">Cost</th>
                      <th className="px-3 py-2 text-right font-bold">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {order.items.map((item) => {
                      const itemFin = itemFinancials(item, order.channel, fin?.effectiveCutRate);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-ink-muted">
                            {item.quantity} × {item.menuItem.name}
                          </td>
                          <td className="px-3 py-2 text-right text-ink-muted">{formatCurrency(itemFin.revenue)}</td>
                          <td className="px-3 py-2 text-right text-ink-muted">{formatCurrency(itemFin.cost)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${itemFin.profit >= 0 ? "text-leaf" : "text-danger"}`}>
                            {formatCurrency(itemFin.profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : order.costOverride != null ? (
              <p className="rounded-lg bg-sunken p-3 text-xs text-ink-muted">
                Imported from a Foodpanda daily summary report — no itemized breakdown is available. Cost of goods
                below is estimated from your menu&apos;s cost prices and overall dish mix.
              </p>
            ) : null}

            {order.externalId && (
              <p className="mt-2 text-xs text-ink-muted">Foodpanda order code: {order.externalId}</p>
            )}

            {fin && (
              <div className="mt-4 space-y-1.5 rounded-lg bg-sunken p-4 text-sm">
                {((order.discount ?? 0) > 0 || (order.deliveryCharge ?? 0) > 0 || (order.tip ?? 0) > 0) && (
                  <div className="space-y-1.5 border-b border-line pb-1.5 text-ink-muted">
                    <div className="flex justify-between">
                      <span>Items subtotal</span>
                      <span>{formatCurrency(fin.revenue + (order.discount ?? 0) - (order.deliveryCharge ?? 0) - (order.tip ?? 0))}</span>
                    </div>
                    {(order.discount ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Flat discount</span>
                        <span>−{formatCurrency(order.discount ?? 0)}</span>
                      </div>
                    )}
                    {(order.deliveryCharge ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery charge</span>
                        <span>+{formatCurrency(order.deliveryCharge ?? 0)}</span>
                      </div>
                    )}
                    {(order.tip ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Tip</span>
                        <span>+{formatCurrency(order.tip ?? 0)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-ink-muted">
                  <span>Revenue</span>
                  <span>{formatCurrency(fin.revenue)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Cost of goods</span>
                  <span>−{formatCurrency(fin.cost)}</span>
                </div>
                {order.channel === "FOODPANDA" && (
                  <div className="flex justify-between text-ink-muted">
                    <span>
                      {order.platformCutOverride != null
                        ? order.invoiceId
                          ? "Foodpanda commission + tax (invoice)"
                          : "Foodpanda commission + tax (estimated from payout)"
                        : `Foodpanda cut (${Math.round(FOODPANDA_COMMISSION_RATE * 100)}% est.)`}
                    </span>
                    <span>−{formatCurrency(fin.platformCut)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-1.5 font-bold text-ink">
                  <span>Profit</span>
                  <span className={fin.profit >= 0 ? "text-leaf" : "text-danger"}>
                    {formatCurrency(fin.profit)}
                  </span>
                </div>
              </div>
            )}

            {order.notes && <p className="mt-4 text-sm text-ink-muted">Note: {order.notes}</p>}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
