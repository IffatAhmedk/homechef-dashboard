"use client";

import useSWR from "swr";
import { IndianRupee, ShoppingBag, Users, AlertTriangle } from "lucide-react";
import StatCard from "./stat-card";
import RevenueChart from "./revenue-chart";
import { formatCurrency, STATUS_LABELS, STATUS_COLORS } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";

interface Analytics {
  revenueToday: number;
  ordersToday: number;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  dailyRevenue: { date: string; revenue: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  statusCounts: { status: string; count: number }[];
  lowStockItems: { id: string; name: string; stockQty: number }[];
}

export default function AdminOverviewPage() {
  const { data } = useSWR<Analytics>("/api/analytics", fetcher, { refreshInterval: 15000 });

  if (!data) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Overview</h1>
        <p className="text-sm text-neutral-500">How Rozana is doing today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue today" value={formatCurrency(data.revenueToday)} icon={IndianRupee} hint={`${data.ordersToday} orders today`} />
        <StatCard label="Total revenue" value={formatCurrency(data.totalRevenue)} icon={IndianRupee} hint={`${data.totalOrders} orders total`} />
        <StatCard label="Customers" value={String(data.totalCustomers)} icon={Users} />
        <StatCard
          label="Low stock items"
          value={String(data.lowStockItems.length)}
          icon={AlertTriangle}
          hint={data.lowStockItems[0] ? data.lowStockItems.map((i) => i.name).slice(0, 2).join(", ") : "All stocked"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Revenue — last 7 days</h2>
          <RevenueChart data={data.dailyRevenue} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Orders by status</h2>
          <div className="space-y-2">
            {data.statusCounts.length === 0 && <p className="text-sm text-neutral-400">No orders yet.</p>}
            {data.statusCounts.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                  {STATUS_LABELS[s.status]}
                </span>
                <span className="text-sm font-medium text-neutral-700">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <ShoppingBag size={15} className="text-orange-500" /> Top-selling items
          </h2>
          <div className="space-y-2">
            {data.topItems.length === 0 && <p className="text-sm text-neutral-400">No sales yet.</p>}
            {data.topItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{item.name}</span>
                <span className="text-neutral-500">
                  {item.qty} sold · {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <AlertTriangle size={15} className="text-amber-500" /> Low stock
          </h2>
          <div className="space-y-2">
            {data.lowStockItems.length === 0 && <p className="text-sm text-neutral-400">Everything well stocked.</p>}
            {data.lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{item.name}</span>
                <span className={item.stockQty === 0 ? "font-medium text-red-600" : "text-amber-600"}>
                  {item.stockQty} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
