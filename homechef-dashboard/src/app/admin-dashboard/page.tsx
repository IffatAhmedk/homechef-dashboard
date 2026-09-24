"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Upload, Plus, TrendingUp, TrendingDown, Wallet, Percent, ArrowUp, ArrowDown } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { RangePreset } from "@/lib/date-range";
import { Badge, StatCard, btnPrimary, btnSecondary, btnQuiet } from "@/components/ui";
import DateRangeFilter from "./date-range-filter";
import OrderTable, { OrderRow } from "./order-table";
import OrderDetailPanel from "./order-detail-panel";
import ProfitBreakdownPanel from "./profit-breakdown-panel";
import CsvImportModal from "./csv-import-modal";
import AddOrderModal from "./add-order-modal";
import { useAnalytics } from "./range-context";

const PERIOD_WORDS: Record<RangePreset, string> = {
  week: "this week",
  lastWeek: "last week",
  month: "this month",
  custom: "in this period",
};

export default function AdminDashboardPage() {
  const { analytics: a, preset, customFrom, customTo, setPreset, setCustom, fromISO, toISO } = useAnalytics();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data: orders = [] } = useSWR<OrderRow[]>(`/api/orders?from=${fromISO}&to=${toISO}`, fetcher, {
    refreshInterval: 15000,
  });

  const period = PERIOD_WORDS[preset];
  const margin = a && a.sales > 0 ? (a.profit / a.sales) * 100 : 0;
  const profitTone = !a || a.profit >= 0 ? "good" : "bad";

  const daily = a?.daily ?? [];
  const salesSeries = daily.map((d) => ({ date: d.date, value: d.sales }));
  const costSeries = daily.map((d) => ({ date: d.date, value: d.cost }));
  const profitSeries = daily.map((d) => ({ date: d.date, value: d.profit }));
  const marginSeries = daily.map((d) => ({ date: d.date, value: d.sales > 0 ? (d.profit / d.sales) * 100 : 0 }));

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-ink">Assalam o Alaikum</h1>
          <p className="text-base text-ink-muted">Here is how Rozana is doing {period}.</p>
        </div>
        <DateRangeFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={setPreset}
          onCustomChange={setCustom}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Sales ${period}`}
          value={a?.sales ?? 0}
          icon={TrendingUp}
          series={salesSeries}
          hint={a ? `${a.successfulCount} successful orders` : undefined}
        />
        <StatCard
          label="Total costs"
          value={a?.totalOperatingCost ?? 0}
          icon={Wallet}
          series={costSeries}
          hint="Food, packaging, Foodpanda, other"
        />
        <StatCard
          label="Net profit"
          value={a?.profit ?? 0}
          tone={profitTone}
          icon={profitTone === "good" ? TrendingUp : TrendingDown}
          series={profitSeries}
          onClick={() => setShowBreakdown(true)}
          hint={
            profitTone === "good" ? (
              <>
                <ArrowUp size={14} strokeWidth={2.4} /> Profit after all costs · tap for the breakdown
              </>
            ) : (
              <>
                <ArrowDown size={14} strokeWidth={2.4} /> Loss after all costs · tap for the breakdown
              </>
            )
          }
        />
        <StatCard
          label="Net margin"
          value={margin}
          format="percent"
          icon={Percent}
          series={marginSeries}
          hint="Of every Rs 100 sold, this is yours"
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-ink">Where the money went</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard size="small" label="Foodpanda sales" value={a?.foodpandaSales ?? 0} />
          <StatCard size="small" label="Private sales" value={a?.privateSales ?? 0} />
          <StatCard size="small" label="Average order" value={a?.averageOrderValue ?? 0} />
          <StatCard size="small" label="Tax withheld" value={a?.taxWithheld ?? 0} hint="Sales and income tax" />
          <StatCard size="small" label="Foodpanda charges" value={a?.foodpandaCharges ?? 0} hint="Commission, fees, SST" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl text-ink">Order history</h2>
            <Badge tone="good">{a?.successfulCount ?? 0} successful</Badge>
            <Badge tone="warn">{a?.cancelledCount ?? 0} wastage</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImport(true)} className={btnSecondary}>
              <Upload size={16} strokeWidth={2.4} /> Upload orders
            </button>
            <button onClick={() => setShowAddOrder(true)} className={btnPrimary}>
              <Plus size={16} strokeWidth={2.4} /> Add an order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_7fr]">
          <div className="rounded-lg bg-card p-5 shadow-card lg:self-start">
            <h3 className="mb-3 font-heading text-lg text-ink">Best sellers</h3>
            {a && a.bestSellers.length > 0 ? (
              <ol className="space-y-3">
                {a.bestSellers.map((item, i) => (
                  <li key={item.menuItemId} className="flex items-baseline justify-between gap-3 text-base">
                    <span className="font-bold text-ink">
                      {i + 1}. {item.name}
                    </span>
                    <span className="shrink-0 text-ink-muted">{item.quantity} sold</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-base text-ink-muted">Nothing sold in this period yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <OrderTable orders={orders} onSelect={setSelectedOrderId} limit={10} />
            <Link href="/admin-dashboard/orders" className={btnQuiet}>
              See all orders
            </Link>
          </div>
        </div>
      </section>

      {showBreakdown && <ProfitBreakdownPanel analytics={a} periodLabel={period} onClose={() => setShowBreakdown(false)} />}
      <OrderDetailPanel orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
      {showAddOrder && <AddOrderModal onClose={() => setShowAddOrder(false)} />}
    </div>
  );
}
