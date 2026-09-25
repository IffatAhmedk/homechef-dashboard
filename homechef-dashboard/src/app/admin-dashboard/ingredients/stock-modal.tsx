"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import { useDialogs } from "@/components/dialogs";
import { btnPrimary } from "@/components/ui";
import PurchaseFields, { PurchaseValues, buyUnitsFor, purchaseInBase, todayISO } from "./purchase-fields";

export interface StockIngredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  stockQty: number;
  tracked: boolean;
}

type Mode = "PURCHASE" | "COUNT" | "WASTAGE";

const MODES: { value: Mode; label: string }[] = [
  { value: "PURCHASE", label: "Bought" },
  { value: "COUNT", label: "Counted" },
  { value: "WASTAGE", label: "Wasted or spoiled" },
];

function qty(n: number) {
  return Number(n.toFixed(2)).toLocaleString("en-PK");
}

export default function StockModal({ ingredient, onClose }: { ingredient: StockIngredient; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(ingredient.tracked ? "PURCHASE" : "COUNT");
  const [quantity, setQuantity] = useState("");
  const [purchase, setPurchase] = useState<PurchaseValues>({
    quantity: "",
    buyUnit: buyUnitsFor(ingredient.unit)[0].value,
    price: "",
    date: todayISO(),
  });
  const [unitCost, setUnitCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const bought = purchaseInBase(ingredient.unit, purchase);
    const res = await fetch(`/api/ingredients/${ingredient.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: mode,
        quantity: mode === "PURCHASE" ? bought.quantity : Number(quantity),
        totalCost: mode === "PURCHASE" ? bought.total : undefined,
        unitCost: mode === "COUNT" && unitCost !== "" ? Number(unitCost) : undefined,
        date: mode === "PURCHASE" ? purchase.date : mode === "COUNT" ? undefined : date,
        note: note || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not save");
      return;
    }
    await mutate("/api/ingredients");
    await mutate("/api/menu");
    await mutate((key) => typeof key === "string" && key.startsWith("/api/analytics"));
    onClose();
  }

  const bought = purchaseInBase(ingredient.unit, purchase);
  const paidPerUnit = mode === "PURCHASE" ? bought.unitPrice : null;
  const onHand = Math.max(0, ingredient.stockQty);
  const blended =
    paidPerUnit != null
      ? onHand > 0
        ? (onHand * ingredient.costPerUnit + bought.quantity * paidPerUnit) / (onHand + bought.quantity)
        : paidPerUnit
      : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-heading text-2xl text-ink">{ingredient.name}</h2>
            <p className="text-caption text-ink-muted">
              {ingredient.tracked
                ? `${qty(ingredient.stockQty)} ${ingredient.unit} in stock now`
                : "Stock not counted yet — start with what you have today"}
            </p>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="What happened">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                aria-pressed={mode === m.value}
                className={`rounded-pill border px-4 text-label font-bold ${
                  mode === m.value ? "border-ink bg-ink text-on-ink" : "border-control bg-card text-ink hover:bg-sunken"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "PURCHASE" ? (
            <PurchaseFields unit={ingredient.unit} values={purchase} onChange={setPurchase} />
          ) : (
            <label className="block text-label font-bold text-ink-muted">
              {mode === "COUNT" ? `How much do you have now? (${ingredient.unit})` : `How much was lost? (${ingredient.unit})`}
              <input
                required
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full"
              />
            </label>
          )}

          {mode === "COUNT" && !ingredient.tracked && (
            <label className="block text-label font-bold text-ink-muted">
              Cost per {ingredient.unit} (Rs) {ingredient.costPerUnit > 0 ? "— leave blank to keep the current price" : "— optional"}
              <input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mt-1 w-full" />
            </label>
          )}

          {mode === "WASTAGE" && (
            <label className="block text-label font-bold text-ink-muted">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full" />
            </label>
          )}

          <label className="block text-label font-bold text-ink-muted">
            Note (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full" />
          </label>

          {mode === "PURCHASE" && paidPerUnit != null && blended != null && (
            <p className="rounded-sm bg-sunken p-3 text-base text-ink">
              {ingredient.stockQty > 0
                ? `With the ${qty(ingredient.stockQty)} ${ingredient.unit} you already have (at ${ingredient.costPerUnit.toFixed(2)}), the average price becomes ${blended.toFixed(2)} per ${ingredient.unit}.`
                : `The price will be set to ${blended.toFixed(2)} per ${ingredient.unit}.`}
            </p>
          )}
          {mode === "COUNT" && ingredient.tracked && quantity !== "" && (
            <p className="rounded-sm bg-sunken p-3 text-base text-ink">
              This changes stock by {qty(Number(quantity) - ingredient.stockQty)} {ingredient.unit} to match what you counted.
            </p>
          )}

          {error && <p className="text-base text-danger">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className="rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Movement {
  id: string;
  type: "OPENING" | "PURCHASE" | "SALE" | "WASTAGE" | "ADJUSTMENT";
  quantity: number;
  unitCost: number | null;
  date: string;
  note: string | null;
  order: { externalId: string | null; customer: { name: string } } | null;
}

const TYPE_LABEL: Record<Movement["type"], string> = {
  OPENING: "Starting stock",
  PURCHASE: "Bought",
  SALE: "Used in sales",
  WASTAGE: "Wasted",
  ADJUSTMENT: "Stock count",
};

export function StockHistoryModal({ ingredient, onClose }: { ingredient: StockIngredient; onClose: () => void }) {
  const { confirm, notify } = useDialogs();
  const key = `/api/ingredients/${ingredient.id}/stock`;
  const { data: movements } = useSWR<Movement[]>(key, fetcher);

  async function remove(m: Movement) {
    const ok = await confirm({
      title: `Remove this ${TYPE_LABEL[m.type].toLowerCase()} entry?`,
      message: "Stock goes back to what it was without it.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`${key}?movementId=${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      await notify({ title: "Can't remove it", message: (await res.json()).error ?? "Something went wrong" });
      return;
    }
    await mutate(key);
    await mutate("/api/ingredients");
  }
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">{ingredient.name} — coming and going</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-sunken text-left text-label font-bold text-ink-muted">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">What</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">Price each</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(movements ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-ink-muted">{formatDate(m.date)}</td>
                  <td className="px-4 py-2">
                    <p className="font-bold text-ink">{TYPE_LABEL[m.type]}</p>
                    {(m.note || m.order) && (
                      <p className="text-caption text-ink-muted">
                        {m.order ? `Order ${m.order.externalId ?? m.order.customer.name}` : m.note}
                      </p>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right font-bold ${m.quantity >= 0 ? "text-leaf" : "text-danger"}`}>
                    {m.quantity >= 0 ? "+" : "−"}
                    {qty(Math.abs(m.quantity))} {ingredient.unit}
                  </td>
                  <td className="px-4 py-2 text-right text-ink-muted">{m.unitCost != null ? m.unitCost.toFixed(2) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {!m.order && (
                      <button onClick={() => remove(m)} className="rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft">
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements && movements.length === 0 && (
            <p className="p-6 text-center text-base text-ink-muted">Nothing recorded yet. Use Update stock to log a purchase or a count.</p>
          )}
        </div>
      </div>
    </div>
  );
}
