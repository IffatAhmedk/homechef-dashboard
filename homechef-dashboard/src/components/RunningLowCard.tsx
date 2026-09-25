import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatQuantity } from "@/lib/units";
import type { Ingredient } from "@/models";

/** "About 3 days", "Out of stock"… for how long an ingredient will last at the recent pace. */
export function lastsText(ingredient: Ingredient) {
  if (!ingredient.tracked) return "—";
  if (ingredient.stockQty <= 0) return "Out of stock";
  if (ingredient.daysLeft == null) return "No recent use";
  if (ingredient.daysLeft < 1) return "Less than a day";
  const days = Math.round(ingredient.daysLeft);
  return `About ${days} day${days === 1 ? "" : "s"}`;
}

/** The ingredients that are out of stock or will run out within a week. */
export function RunningLowCard({ ingredients }: { ingredients: Ingredient[] }) {
  const tracked = ingredients.filter((i) => i.tracked);
  const low = tracked.filter((i) => i.stockQty <= 0 || (i.daysLeft != null && i.daysLeft <= 7));

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-heading text-xl text-ink">
        <AlertTriangle size={18} strokeWidth={2.2} className="text-warn" /> Running low
      </h2>
      {tracked.length === 0 ? (
        <p className="text-base text-ink-muted">
          Tell the app what you have today with Update stock on each ingredient. From then on, every sale uses up ingredients through its recipe and this list
          shows what is running out.
        </p>
      ) : low.length === 0 ? (
        <p className="text-base text-ink-muted">Nothing is running low. Everything lasts more than a week at the current pace.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {low.map((i) => (
            <li key={i.id}>
              <Badge tone={i.stockQty <= 0 ? "bad" : "warn"}>
                {i.name}: {i.stockQty <= 0 ? "out of stock" : `${lastsText(i).toLowerCase()} (${formatQuantity(i.stockQty)} ${i.unit} left)`}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
