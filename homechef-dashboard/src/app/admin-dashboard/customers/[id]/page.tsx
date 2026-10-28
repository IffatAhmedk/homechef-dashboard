"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { PillGroup } from "@/components/PillGroup";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateRange } from "@/data/analytics";
import { useCustomers, useOrders } from "@/data/orders";
import { formatCurrency, formatDate, formatDateTime, PAYMENT_STATUS_LABELS, STATUS_FLOW, STATUS_LABELS } from "@/lib/format";

const STATUS_FILTERS = [{ value: "ALL", label: "All" }, ...[...STATUS_FLOW, "CANCELLED"].map((s) => ({ value: s, label: STATUS_LABELS[s] }))];
const PAYMENT_FILTERS = [
  { value: "ALL", label: "All" },
  ...Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function itemsSummary(order: { items: { quantity: number; menuItem: { name: string } }[] }) {
  return order.items.map((i) => `${i.quantity} × ${i.menuItem.name}`).join(", ");
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fromISO, toISO } = useDateRange();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders(fromISO, toISO, undefined, id);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const customer = customers.find((c) => c.id === id);

  const shown = orders
    .filter((o) => statusFilter === "ALL" || o.status === statusFilter)
    .filter((o) => paymentFilter === "ALL" || o.paymentStatus === paymentFilter);
  const total = shown.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-4">
      <Link href="/admin-dashboard/customers" className="inline-flex items-center gap-1 text-base text-ink-muted hover:text-ink">
        <ArrowLeft size={16} strokeWidth={2.4} /> Customers
      </Link>

      {!customer ? (
        <p className="p-6 text-center text-base text-ink-muted">Customer not found.</p>
      ) : (
        <>
          <PageHeader title={customer.name} subtitle={customer.phone} actions={<DateRangeFilter />} />

          <div className="rounded-lg bg-card p-4 text-base text-ink-muted shadow-card">
            {customer.address && <p>{customer.address}</p>}
            <p>Last order: {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Orders" value={customer.orderCount} format="count" />
            <StatCard label="Total spent" value={customer.totalSpent} />
          </div>

          <div className="space-y-3">
            <PillGroup label="Order status" options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
            <PillGroup label="Payment" options={PAYMENT_FILTERS} value={paymentFilter} onChange={setPaymentFilter} />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-sunken">
                  <TableCell colSpan={4} className="font-bold text-ink">
                    Total ({shown.length} order{shown.length === 1 ? "" : "s"})
                  </TableCell>
                  <TableCell className="text-right font-bold text-ink">{formatCurrency(total)}</TableCell>
                </TableRow>
                {shown.map((order) => (
                  <TableRow key={order.id} onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer hover:bg-sunken">
                    <TableCell className="text-ink-muted">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate text-ink-muted">{itemsSummary(order)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge order={order} />
                    </TableCell>
                    <TableCell>{order.channel === "DIRECT" && <PaymentStatusBadge order={order} />}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(order.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {shown.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No orders in this period.</p>}
          </div>
        </>
      )}

      {selectedOrderId && <OrderDetailSheet orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  );
}
