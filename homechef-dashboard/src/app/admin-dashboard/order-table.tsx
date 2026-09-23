"use client";

import { formatCurrency, formatDateTime, STATUS_LABELS } from "@/lib/format";
import { orderFinancials } from "@/lib/finance";
import { Badge } from "@/components/ui";

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
  wastage?: boolean;
  costOverride?: number | null;
  platformCutOverride?: number | null;
  customer: { name: string };
  items: OrderItem[];
}

function StatusBadge({ order }: { order: OrderRow }) {
  if (order.status === "CANCELLED") {
    return order.wastage ? <Badge tone="warn">Wastage</Badge> : <Badge tone="bad">Cancelled</Badge>;
  }
  if (order.status === "DELIVERED") return <Badge tone="good">Successful</Badge>;
  return <Badge tone="warn">{STATUS_LABELS[order.status] ?? order.status}</Badge>;
}

export default function OrderTable({
  orders,
  onSelect,
  limit,
}: {
  orders: OrderRow[];
  onSelect: (id: string) => void;
  limit?: number;
}) {
  const rows = limit ? orders.slice(0, limit) : orders;
  return (
    <div className="overflow-x-auto rounded-lg bg-card shadow-card">
      <table className="w-full text-body-lg">
        <thead>
          <tr className="bg-sunken text-left text-label font-bold text-ink-muted">
            <th className="px-4 py-2 font-bold">Order</th>
            <th className="px-4 py-2 font-bold">Date</th>
            <th className="px-4 py-2 font-bold">Status</th>
            <th className="px-4 py-2 text-right font-bold">Sales</th>
            <th className="px-4 py-2 text-right font-bold">You receive</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((order) => {
            const fin = orderFinancials(order);
            return (
              <tr
                key={order.id}
                onClick={() => onSelect(order.id)}
                className="cursor-pointer hover:bg-sunken"
              >
                <td className="px-4 py-2">
                  <p className="font-bold text-ink">{order.customer.name}</p>
                  <p className="text-caption text-ink-muted">{order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}</p>
                </td>
                <td className="px-4 py-2 text-ink-muted">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-2">
                  <StatusBadge order={order} />
                </td>
                <td className="px-4 py-2 text-right text-ink">{formatCurrency(fin.revenue)}</td>
                <td className="px-4 py-2 text-right font-bold text-ink">
                  {formatCurrency(order.status === "CANCELLED" ? 0 : fin.revenue - fin.platformCut)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-6 text-center text-body text-ink-muted">No orders in this period.</p>}
    </div>
  );
}
