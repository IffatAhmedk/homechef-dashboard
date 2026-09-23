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
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Order detail</h2>
          <div className="flex items-center gap-1">
            {order?.channel === "DIRECT" && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-terracotta hover:bg-cream"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
              <X size={18} />
            </button>
          </div>
        </div>

        {!order ? (
          <p className="p-5 text-sm text-charcoal/40">Loading…</p>
        ) : (
          <div className="flex-1 p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-medium text-charcoal">{order.customer.name}</p>
                <p className="text-sm text-charcoal/50">{order.customer.phone}</p>
                <p className="text-xs text-charcoal/40">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    order.channel === "FOODPANDA" ? "bg-maroon/10 text-maroon" : "bg-terracotta/10 text-terracotta"
                  }`}
                >
                  {order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
            </div>

            <p className="mb-4 text-sm text-charcoal/50">Deliver to: {order.deliveryAddress}</p>

            {order.items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-warm-beige/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warm-beige/30 bg-cream text-left text-xs uppercase text-charcoal/40">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Price</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                      <th className="px-3 py-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-beige/20">
                    {order.items.map((item) => {
                      const itemFin = itemFinancials(item, order.channel, fin?.effectiveCutRate);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-charcoal/80">
                            {item.quantity} × {item.menuItem.name}
                          </td>
                          <td className="px-3 py-2 text-right text-charcoal/60">{formatCurrency(itemFin.revenue)}</td>
                          <td className="px-3 py-2 text-right text-charcoal/50">{formatCurrency(itemFin.cost)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${itemFin.profit >= 0 ? "text-sage" : "text-maroon"}`}>
                            {formatCurrency(itemFin.profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : order.costOverride != null ? (
              <p className="rounded-lg bg-warm-beige/20 p-3 text-xs text-charcoal/60">
                Imported from a Foodpanda daily summary report — no itemized breakdown is available. Cost of goods
                below is estimated from your menu&apos;s cost prices and overall dish mix.
              </p>
            ) : null}

            {order.externalId && (
              <p className="mt-2 text-xs text-charcoal/40">Foodpanda order code: {order.externalId}</p>
            )}

            {fin && (
              <div className="mt-4 space-y-1.5 rounded-lg bg-cream p-4 text-sm">
                {((order.discount ?? 0) > 0 || (order.deliveryCharge ?? 0) > 0 || (order.tip ?? 0) > 0) && (
                  <div className="space-y-1.5 border-b border-warm-beige/40 pb-1.5 text-charcoal/50">
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
                <div className="flex justify-between text-charcoal/60">
                  <span>Revenue</span>
                  <span>{formatCurrency(fin.revenue)}</span>
                </div>
                <div className="flex justify-between text-charcoal/60">
                  <span>Cost of goods</span>
                  <span>−{formatCurrency(fin.cost)}</span>
                </div>
                {order.channel === "FOODPANDA" && (
                  <div className="flex justify-between text-charcoal/60">
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
                <div className="flex justify-between border-t border-warm-beige/40 pt-1.5 font-semibold text-charcoal">
                  <span>Profit</span>
                  <span className={fin.profit >= 0 ? "text-sage" : "text-maroon"}>
                    {formatCurrency(fin.profit)}
                  </span>
                </div>
              </div>
            )}

            {order.notes && <p className="mt-4 text-sm text-charcoal/50">Note: {order.notes}</p>}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
