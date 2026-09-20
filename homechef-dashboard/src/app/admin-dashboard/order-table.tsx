"use client";

import { formatCurrency, formatDateTime } from "@/lib/format";
import { orderFinancials } from "@/lib/finance";

interface OrderItem {
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
}

export interface OrderRow {
  id: string;
  channel: "DIRECT" | "FOODPANDA";
  status: string;
  totalAmount: number;
  createdAt: string;
  costOverride?: number | null;
  platformCutOverride?: number | null;
  customer: { name: string };
  items: OrderItem[];
}

const CHANNEL_STYLES: Record<string, string> = {
  DIRECT: "bg-terracotta/10 text-terracotta",
  FOODPANDA: "bg-maroon/10 text-maroon",
};

export default function OrderTable({ orders, onSelect }: { orders: OrderRow[]; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-warm-beige/40 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-warm-beige/30 text-left text-xs uppercase text-charcoal/40">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Channel</th>
            <th className="px-4 py-3 text-right font-medium">Revenue</th>
            <th className="px-4 py-3 text-right font-medium">Cost</th>
            <th className="px-4 py-3 text-right font-medium">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-beige/20">
          {orders.map((order) => {
            const fin = orderFinancials(order);
            return (
              <tr
                key={order.id}
                onClick={() => onSelect(order.id)}
                className="cursor-pointer hover:bg-cream"
              >
                <td className="px-4 py-3 text-charcoal/50">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-charcoal">{order.customer.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_STYLES[order.channel]}`}>
                    {order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-charcoal/70">{formatCurrency(fin.revenue)}</td>
                <td className="px-4 py-3 text-right text-charcoal/50">{formatCurrency(fin.cost + fin.platformCut)}</td>
                <td className={`px-4 py-3 text-right font-medium ${fin.profit >= 0 ? "text-sage" : "text-maroon"}`}>
                  {formatCurrency(fin.profit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && <p className="p-6 text-center text-sm text-charcoal/40">No orders in this period.</p>}
    </div>
  );
}
