import { ArrowDown, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ProfitItem } from "@/models";

/** Every item, best first. Losses sit at the bottom in red with the word Loss. */
export function MenuProfitBars({ rows }: { rows: ProfitItem[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  if (rows.length === 0) return <p className="text-body text-ink-muted">No sales in this period yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r, index) => {
        const loss = r.profit < 0;
        const best = index === 0 && !loss;
        return (
          <li key={r.menuItemId}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-bold text-ink">{r.name}</span>
              <span className={`flex items-center gap-1 text-body font-bold ${loss ? "text-danger" : "text-leaf"}`}>
                {loss ? <ArrowDown size={16} strokeWidth={2.4} /> : <ArrowUp size={16} strokeWidth={2.4} />}
                {loss ? "Loss " : "Profit "}
                {formatCurrency(Math.abs(r.profit))}
              </span>
            </div>
            <div className="mt-1 h-4 rounded-sm bg-sunken">
              <div
                className={`h-4 rounded-sm ${loss ? "bg-danger" : best ? "bg-terracotta" : "bg-leaf"}`}
                style={{ width: `${Math.max(2, (Math.abs(r.profit) / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
