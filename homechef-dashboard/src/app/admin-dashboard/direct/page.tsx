"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddOrderModal } from "@/components/AddOrderModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExpensesPanel } from "@/components/ExpensesPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateRange } from "@/data/analytics";
import { useDirect } from "@/data/direct";
import { formatCurrency, formatDateTime, STATUS_LABELS } from "@/lib/format";

export default function DirectPage() {
  const { fromISO, toISO } = useDateRange();
  const { data } = useDirect(fromISO, toISO);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Direct orders" actions={<DateRangeFilter />} />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Sales" value={data?.sales ?? 0} />
        <StatCard label="Cost" value={data?.cost ?? 0} tone="bad" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_7fr]">
        <Card>
          <h2 className="mb-3 font-heading text-lg text-ink">Best sellers</h2>
          {data && data.bestSellers.length > 0 ? (
            <ol className="space-y-3">
              {data.bestSellers.map((item, i) => (
                <li key={item.menuItemId} className="flex items-baseline justify-between gap-3 text-base">
                  <span className="font-bold text-ink">
                    {i + 1}. {item.name}
                  </span>
                  <span className="text-ink-muted">{item.quantity} sold</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-base text-ink-muted">Nothing sold yet.</p>
          )}
        </Card>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} strokeWidth={2.4} /> Add order
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.orders ?? []).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-ink-muted">{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell className="font-bold text-ink">{order.customerName}</TableCell>
                  <TableCell>{order.itemCount}</TableCell>
                  <TableCell className={order.status === "CANCELLED" ? "text-danger" : "text-ink-muted"}>{STATUS_LABELS[order.status] ?? order.status}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.orders.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No direct orders in this period.</p>}
        </div>
      </div>

      <ExpensesPanel from={fromISO} to={toISO} />

      {adding && <AddOrderModal onClose={() => setAdding(false)} />}
    </div>
  );
}
