"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X, Plus, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency } from "@/lib/format";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { buyUnitsFor } from "../ingredients/purchase-fields";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: "FOOD" | "PACKAGING";
}

interface SavedLine {
  id: string;
  quantity: number;
  ingredient: Ingredient | null;
}

interface Row {
  key: number;
  ingredientId: string;
  amount: string;
  unit: string;
}

/** Shows a stored amount in the friendliest unit, e.g. 1500 g as 1.5 kg. */
function friendly(unit: string, base: number): { amount: string; unit: string } {
  const opts = [...buyUnitsFor(unit)].sort((a, b) => b.factor - a.factor);
  const pick = opts.find((o) => base >= o.factor) ?? opts[opts.length - 1];
  return { amount: String(Number((base / pick.factor).toFixed(3))), unit: pick.value };
}

function money(n: number) {
  return n < 10 ? `Rs ${n.toFixed(2)}` : formatCurrency(n);
}

export default function RecipeModal({
  menuItemId,
  menuItemName,
  batchYield,
  onClose,
}: {
  menuItemId: string;
  menuItemName: string;
  batchYield: number;
  onClose: () => void;
}) {
  const { data: lines } = useSWR<SavedLine[]>(`/api/menu/${menuItemId}/recipe`, fetcher, { revalidateOnFocus: false });
  const { data: ingredients } = useSWR<Ingredient[]>("/api/ingredients", fetcher, { revalidateOnFocus: false });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-heading text-2xl text-ink">Recipe</h2>
            <p className="text-caption text-ink-muted">{menuItemName}</p>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>
        {!lines || !ingredients ? (
          <p className="p-6 text-base text-ink-muted">Loading…</p>
        ) : (
          <RecipeEditor menuItemId={menuItemId} batchYield={batchYield} savedLines={lines} ingredients={ingredients} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function RecipeEditor({
  menuItemId,
  batchYield,
  savedLines,
  ingredients,
  onClose,
}: {
  menuItemId: string;
  batchYield: number;
  savedLines: SavedLine[];
  ingredients: Ingredient[];
  onClose: () => void;
}) {
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  const [servings, setServings] = useState(String(batchYield > 0 ? batchYield : 1));
  const [rows, setRows] = useState<Row[]>(() => {
    const initial = savedLines
      .filter((l) => l.ingredient)
      .map((l, i): Row => {
        const f = friendly(l.ingredient!.unit, l.quantity);
        return { key: i + 1, ingredientId: l.ingredient!.id, amount: f.amount, unit: f.unit };
      });
    return initial.length > 0 ? initial : [{ key: 1, ingredientId: "", amount: "", unit: "" }];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedIds = new Set(rows.map((r) => r.ingredientId).filter(Boolean));

  function update(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function pick(key: number, ingredientId: string) {
    const ing = byId.get(ingredientId);
    update(key, { ingredientId, unit: ing ? buyUnitsFor(ing.unit).sort((a, b) => b.factor - a.factor)[0].value : "" });
  }
  function addRow() {
    const maxKey = rows.reduce((m, r) => Math.max(m, r.key), 0);
    setRows((prev) => [...prev, { key: maxKey + 1, ingredientId: "", amount: "", unit: "" }]);
  }

  function baseQuantity(row: Row) {
    const ing = byId.get(row.ingredientId);
    if (!ing) return 0;
    const opt = buyUnitsFor(ing.unit).find((o) => o.value === row.unit) ?? buyUnitsFor(ing.unit)[0];
    return (Number(row.amount) || 0) * opt.factor;
  }

  const filled = rows.filter((r) => r.ingredientId && baseQuantity(r) > 0);
  const lineCosts = filled.map((r) => {
    const ing = byId.get(r.ingredientId)!;
    return { row: r, ing, cost: baseQuantity(r) * ing.costPerUnit };
  });
  const batchCost = lineCosts.reduce((s, l) => s + l.cost, 0);
  const packagingCost = lineCosts.filter((l) => l.ing.category === "PACKAGING").reduce((s, l) => s + l.cost, 0);
  const servingCount = Math.max(1, Math.floor(Number(servings)) || 1);
  const unpriced = lineCosts.filter((l) => l.ing.costPerUnit <= 0).map((l) => l.ing.name);

  async function handleSave() {
    setError(null);
    if (filled.length === 0) {
      setError("Add at least one ingredient with an amount");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/menu/${menuItemId}/recipe`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchYield: servingCount,
        lines: filled.map((r) => ({ ingredientId: r.ingredientId, quantity: baseQuantity(r) })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not save the recipe");
      return;
    }
    await mutate("/api/menu");
    await mutate(`/api/menu/${menuItemId}/recipe`);
    await mutate((key) => typeof key === "string" && key.startsWith("/api/analytics"));
    onClose();
  }

  const food = ingredients.filter((i) => i.category === "FOOD");
  const packaging = ingredients.filter((i) => i.category === "PACKAGING");

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="flex flex-wrap items-center gap-3 text-label font-bold text-ink-muted">
          This recipe makes
          <input
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-24"
            aria-label="Number of servings"
          />
          servings
        </label>
        <p className="-mt-2 text-caption text-ink-muted">
          Enter the amounts for the whole batch you cook. The cost of one serving is worked out by dividing by this number.
        </p>

        <div className="space-y-2">
          {rows.map((row) => {
            const ing = byId.get(row.ingredientId);
            const opts = ing ? buyUnitsFor(ing.unit) : [];
            const cost = ing ? baseQuantity(row) * ing.costPerUnit : 0;
            return (
              <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm bg-sunken p-2 sm:grid-cols-[minmax(0,1fr)_110px_100px_90px_auto]">
                <select
                  aria-label="Ingredient"
                  value={row.ingredientId}
                  onChange={(e) => pick(row.key, e.target.value)}
                  className="col-span-2 w-full sm:col-span-1"
                >
                  <option value="">Choose an ingredient…</option>
                  <optgroup label="Food">
                    {food.map((i) => (
                      <option key={i.id} value={i.id} disabled={usedIds.has(i.id) && i.id !== row.ingredientId}>
                        {i.name} ({i.unit})
                      </option>
                    ))}
                  </optgroup>
                  {packaging.length > 0 && (
                    <optgroup label="Packaging">
                      {packaging.map((i) => (
                        <option key={i.id} value={i.id} disabled={usedIds.has(i.id) && i.id !== row.ingredientId}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="How much?"
                  aria-label="Amount"
                  value={row.amount}
                  onChange={(e) => update(row.key, { amount: e.target.value })}
                  className="w-full"
                />
                {opts.length > 1 ? (
                  <select aria-label="Unit" value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value })} className="w-full">
                    {opts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 text-base text-ink-muted">{ing ? ing.unit : ""}</span>
                )}
                <p className={`text-right text-base font-bold ${ing && ing.costPerUnit <= 0 ? "text-warn" : "text-ink"}`}>
                  {ing ? (ing.costPerUnit <= 0 ? "No price" : money(cost)) : ""}
                </p>
                <button
                  onClick={() => setRows((prev) => (prev.length === 1 ? [{ ...prev[0], ingredientId: "", amount: "", unit: "" }] : prev.filter((r) => r.key !== row.key)))}
                  className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft"
                >
                  <Trash2 size={16} strokeWidth={2.4} /> Remove
                </button>
              </div>
            );
          })}
          <button onClick={addRow} className={btnSecondary}>
            <Plus size={16} strokeWidth={2.4} /> Add ingredient
          </button>
        </div>

        {unpriced.length > 0 && (
          <p className="rounded-sm bg-warn-soft px-4 py-3 text-base text-warn">
            {unpriced.join(", ")} {unpriced.length === 1 ? "has" : "have"} no price yet, so the cost can&apos;t be worked out
            automatically. Log a purchase for {unpriced.length === 1 ? "it" : "them"} on the Ingredients page, or type the cost
            by hand.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 rounded-lg bg-leaf-soft p-4 sm:grid-cols-3">
          <div>
            <p className="text-caption text-ink-muted">Whole batch costs</p>
            <p className="text-2xl font-bold text-ink">{formatCurrency(batchCost)}</p>
          </div>
          <div>
            <p className="text-caption text-ink-muted">Servings</p>
            <p className="text-2xl font-bold text-ink">{servingCount}</p>
          </div>
          <div>
            <p className="text-caption text-ink-muted">Cost of one serving</p>
            <p className="text-2xl font-bold text-leaf">{money(batchCost / servingCount)}</p>
            {packagingCost > 0 && (
              <p className="text-caption text-ink-muted">Includes {money(packagingCost / servingCount)} packaging</p>
            )}
          </div>
        </div>

        {error && <p className="text-base text-danger">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
        <button onClick={onClose} className="rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : "Save recipe"}
        </button>
      </div>
    </>
  );
}
