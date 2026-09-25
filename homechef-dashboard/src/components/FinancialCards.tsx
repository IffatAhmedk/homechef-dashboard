import { ArrowDown, ArrowUp, Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import type { Analytics } from "@/models";

interface FinancialCardsProps {
  analytics?: Analytics;
  /** "this week", "last week"… */
  period: string;
  /** Called when the profit card is tapped. */
  onProfitClick: () => void;
}

/** Sales, total costs, net profit and net margin, each with its trend across the days. */
export function FinancialCards({ analytics: a, period, onProfitClick }: FinancialCardsProps) {
  const daily = a?.daily ?? [];
  const margin = a && a.sales > 0 ? (a.profit / a.sales) * 100 : 0;
  const profitable = !a || a.profit >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={`Sales ${period}`}
        value={a?.sales ?? 0}
        icon={TrendingUp}
        series={daily.map((d) => ({ date: d.date, value: d.sales }))}
        hint={a ? `${a.successfulCount} successful orders` : undefined}
      />
      <StatCard
        label="Total costs"
        value={a?.totalOperatingCost ?? 0}
        icon={Wallet}
        series={daily.map((d) => ({ date: d.date, value: d.cost }))}
        hint="Food, packaging, Foodpanda, other"
      />
      <StatCard
        label="Net profit"
        value={a?.profit ?? 0}
        tone={profitable ? "good" : "bad"}
        icon={profitable ? TrendingUp : TrendingDown}
        series={daily.map((d) => ({ date: d.date, value: d.profit }))}
        onClick={onProfitClick}
        hint={
          <>
            {profitable ? <ArrowUp size={14} strokeWidth={2.4} /> : <ArrowDown size={14} strokeWidth={2.4} />}
            {profitable ? "Profit" : "Loss"} after all costs · tap for the breakdown
          </>
        }
      />
      <StatCard
        label="Net margin"
        value={margin}
        format="percent"
        icon={Percent}
        series={daily.map((d) => ({ date: d.date, value: d.sales > 0 ? (d.profit / d.sales) * 100 : 0 }))}
        hint="Of every Rs 100 sold, this is yours"
      />
    </div>
  );
}
