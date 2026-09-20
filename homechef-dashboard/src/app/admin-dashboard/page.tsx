"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { TrendingUp, TrendingDown, Wallet, Upload, Plus } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { rangeForPreset, RangePreset } from "@/lib/date-range";
import DateRangeFilter from "./date-range-filter";
import KpiCard from "./kpi-card";
import OrderTable, { OrderRow } from "./order-table";
import OrderDetailPanel from "./order-detail-panel";
import ExpensesPanel from "./expenses-panel";
import CsvImportModal from "./csv-import-modal";
import AddOrderModal from "./add-order-modal";

interface Analytics {
  sales: number;
  cogs: number;
  foodpandaCut: number;
  expenses: number;
  cost: number;
  profit: number;
  orderCount: number;
  daily: { date: string; sales: number; cost: number; profit: number }[];
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const [preset, setPreset] = useState<RangePreset>("week");
  const [customFrom, setCustomFrom] = useState(toISODate(new Date()));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);

  const range = useMemo(
    () => rangeForPreset(preset, { from: customFrom, to: customTo }),
    [preset, customFrom, customTo]
  );

  const fromISO = range.from.toISOString();
  const toISO = range.to.toISOString();

  const { data: analytics } = useSWR<Analytics>(
    `/api/analytics?from=${fromISO}&to=${toISO}`,
    fetcher,
    { refreshInterval: 15000 }
  );
  const { data: orders = [] } = useSWR<OrderRow[]>(
    `/api/orders?from=${fromISO}&to=${toISO}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const salesSeries = analytics?.daily.map((d) => ({ date: d.date, value: d.sales })) ?? [];
  const costSeries = analytics?.daily.map((d) => ({ date: d.date, value: d.cost })) ?? [];
  const profitSeries = analytics?.daily.map((d) => ({ date: d.date, value: d.profit })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Dashboard</h1>
          <p className="text-sm text-charcoal/50">Sales, cost and profit for Rozana.</p>
        </div>
        <DateRangeFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={setPreset}
          onCustomChange={(f, t) => {
            setCustomFrom(f);
            setCustomTo(t);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Sales"
          value={analytics?.sales ?? 0}
          icon={TrendingUp}
          hint={analytics ? `${analytics.orderCount} orders` : undefined}
          data={salesSeries}
          color="#8b3e2f"
          tone="terracotta"
        />
        <KpiCard
          label="Profit"
          value={analytics?.profit ?? 0}
          icon={analytics && analytics.profit >= 0 ? TrendingUp : TrendingDown}
          hint={
            analytics && analytics.sales > 0
              ? `${Math.round((analytics.profit / analytics.sales) * 100)}% margin`
              : undefined
          }
          data={profitSeries}
          color="#3f5237"
          tone="sage"
        />
        <KpiCard
          label="Cost"
          value={analytics?.cost ?? 0}
          icon={Wallet}
          hint={
            analytics
              ? `COGS ${Math.round(analytics.cogs)} · Foodpanda ${Math.round(analytics.foodpandaCut)} · Other ${Math.round(analytics.expenses)}`
              : undefined
          }
          data={costSeries}
          color="#6b1f1f"
          tone="maroon"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal/80">Order history</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 rounded-lg border border-warm-beige/60 bg-white px-2.5 py-1.5 text-xs font-medium text-charcoal/70 hover:bg-cream"
              >
                <Upload size={13} /> Import CSV
              </button>
              <button
                onClick={() => setShowAddOrder(true)}
                className="flex items-center gap-1.5 rounded-lg bg-terracotta px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                <Plus size={13} /> Add order
              </button>
            </div>
          </div>
          <OrderTable orders={orders} onSelect={setSelectedOrderId} />
        </div>
        <ExpensesPanel from={fromISO} to={toISO} />
      </div>

      <OrderDetailPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
      {showAddOrder && <AddOrderModal onClose={() => setShowAddOrder(false)} />}
    </div>
  );
}
