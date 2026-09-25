import { Card } from "@/components/ui/card";
import type { ProfitItem } from "@/models";

/** The items that sold the most, top first. */
export function BestSellersCard({ items }: { items: ProfitItem[] }) {
  return (
    <Card className="lg:self-start">
      <h3 className="mb-3 font-heading text-lg text-ink">Best sellers</h3>
      {items.length === 0 ? (
        <p className="text-base text-ink-muted">Nothing sold in this period yet.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={item.menuItemId} className="flex items-baseline justify-between gap-3 text-base">
              <span className="font-bold text-ink">
                {i + 1}. {item.name}
              </span>
              <span className="shrink-0 text-ink-muted">{item.quantity} sold</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
