"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddOrderModal } from "@/components/AddOrderModal";
import { BestSellersCard } from "@/components/BestSellersCard";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExpensesPanel } from "@/components/ExpensesPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateRange } from "@/data/analytics";
import { useDirect } from "@/data/direct";
import { formatCurrency, formatDateTime, STATUS_LABELS } from "@/lib/format";

export default function OverviewPage() {
  const { fromISO, toISO } = useDateRange();
  const { data } = useDirect(fromISO, toISO);
  const [adding, setAdding] = useState(false);
  const profit = (data?.sales ?? 0) - (data?.cost ?? 0);
  const averageOrder = data && data.orderCount > 0 ? data.sales / data.orderCount : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" actions={<DateRangeFilter />} />

      <BestSellersCard items={data?.bestSellers ?? []} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={data?.sales ?? 0} />
        <StatCard label="Cost" value={data?.cost ?? 0} tone="bad" />
        <StatCard label="Profit" value={profit} tone={profit >= 0 ? "good" : "bad"} />
        <StatCard label="Average order" value={averageOrder} />
      </div>

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

      <ExpensesPanel from={fromISO} to={toISO} />

      {adding && <AddOrderModal onClose={() => setAdding(false)} />}
    </div>
  );
}
