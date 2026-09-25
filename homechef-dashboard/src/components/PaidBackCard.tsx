import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Analytics } from "@/models";

/** How much of the startup and packaging spending the profit so far has paid back. */
export function PaidBackCard({ investment }: { investment?: Analytics["investment"] }) {
  const percent = investment?.paidBackPct;

  return (
    <Card>
      {!investment || percent == null ? (
        <p className="text-base text-ink-muted">Add your startup and packaging spending as expenses to see how much of it has been paid back.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-caption text-ink-muted">Spent</p>
              <p className="text-xl font-bold text-ink">{formatCurrency(investment.spent)}</p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Profit so far</p>
              <p className={`text-xl font-bold ${investment.allTimeProfit >= 0 ? "text-leaf" : "text-danger"}`}>{formatCurrency(investment.allTimeProfit)}</p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Paid back</p>
              <p className="text-xl font-bold text-ink">{Math.round(percent)}%</p>
            </div>
          </div>
          <div className="mt-3 h-3 rounded-sm bg-sunken" role="img" aria-label={`${Math.round(percent)} percent paid back`}>
            <div className="h-3 rounded-sm bg-leaf" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </Card>
  );
}
