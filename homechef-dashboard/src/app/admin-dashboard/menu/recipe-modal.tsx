"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X, Plus, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency } from "@/lib/format";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface MenuItemOption {
  id: string;
  name: string;
  costPrice: number;
}

interface RecipeLine {
  id: string;
  quantity: number;
  ingredient: Ingredient | null;
  componentItem: MenuItemOption | null;
}

export default function RecipeModal({
  menuItemId,
  menuItemName,
  onClose,
}: {
  menuItemId: string;
  menuItemName: string;
  onClose: () => void;
}) {
  const recipeKey = `/api/menu/${menuItemId}/recipe`;
  const { data: lines = [] } = useSWR<RecipeLine[]>(recipeKey, fetcher);
  const { data: ingredients = [] } = useSWR<Ingredient[]>("/api/ingredients", fetcher);
  const { data: menuItems = [] } = useSWR<MenuItemOption[]>("/api/menu", fetcher);

  const [kind, setKind] = useState<"ingredient" | "item">("ingredient");
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherItems = menuItems.filter((m) => m.id !== menuItemId);

  async function refreshAll() {
    await mutate(recipeKey);
    await mutate("/api/menu");
  }

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedId) {
      setError("Choose an ingredient or menu item");
      return;
    }
    setAdding(true);
    const res = await fetch(recipeKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientId: kind === "ingredient" ? selectedId : undefined,
        componentItemId: kind === "item" ? selectedId : undefined,
        quantity: Number(quantity),
      }),
    });
    if (res.ok) {
      await refreshAll();
      setSelectedId("");
      setQuantity("1");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add line");
    }
    setAdding(false);
  }

  async function updateQuantity(lineId: string, newQty: string) {
    const q = Number(newQty);
    if (!q || q <= 0) return;
    await fetch(`${recipeKey}/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: q }),
    });
    await refreshAll();
  }

  async function removeLine(lineId: string) {
    await fetch(`${recipeKey}/${lineId}`, { method: "DELETE" });
    await refreshAll();
  }

  const totalCost = lines.reduce((sum, l) => {
    const unitCost = l.ingredient?.costPerUnit ?? l.componentItem?.costPrice ?? 0;
    return sum + unitCost * l.quantity;
  }, 0);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-heading text-2xl text-ink">Recipe</h2>
            <p className="text-xs text-ink-muted">{menuItemName}</p>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {lines.length === 0 && (
            <p className="text-sm text-ink-muted">
              No recipe yet — this item&apos;s cost price is set manually in Menu & Inventory. Add ingredients or
              other menu items (for combos) below to calculate it automatically instead.
            </p>
          )}

          {lines.map((line) => {
            const name = line.ingredient?.name ?? line.componentItem?.name ?? "—";
            const unit = line.ingredient?.unit ?? "×";
            const unitCost = line.ingredient?.costPerUnit ?? line.componentItem?.costPrice ?? 0;
            return (
              <div key={line.id} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{name}</p>
                  <p className="text-xs text-ink-muted">
                    {formatCurrency(unitCost)} / {unit}
                  </p>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={line.quantity}
                  onBlur={(e) => updateQuantity(line.id, e.target.value)}
                  className="w-20 rounded border border-line px-2 py-1 text-sm"
                />
                <span className="w-20 text-right text-sm font-bold text-ink-muted">
                  {formatCurrency(unitCost * line.quantity)}
                </span>
                <button onClick={() => removeLine(line.id)} className="text-ink-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}

          <form onSubmit={handleAddLine} className="space-y-2 rounded-lg bg-sunken p-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setKind("ingredient");
                  setSelectedId("");
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${
                  kind === "ingredient" ? "bg-brand text-on-brand" : "bg-card text-ink-muted"
                }`}
              >
                Ingredient
              </button>
              <button
                type="button"
                onClick={() => {
                  setKind("item");
                  setSelectedId("");
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${
                  kind === "item" ? "bg-brand text-on-brand" : "bg-card text-ink-muted"
                }`}
              >
                Menu item (combo)
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 rounded-sm border border-control px-2 py-1.5 text-sm"
              >
                <option value="">
                  {kind === "ingredient" ? "Select ingredient…" : "Select menu item…"}
                </option>
                {(kind === "ingredient" ? ingredients : otherItems).map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 rounded-sm border border-control px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-1 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {kind === "ingredient" && ingredients.length === 0 && (
              <p className="text-xs text-ink-muted">No ingredients yet — add some under Ingredients first.</p>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </form>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          <span className="text-sm text-ink-muted">Calculated cost</span>
          <span className="text-lg font-bold text-ink">{formatCurrency(totalCost)}</span>
        </div>
      </div>
    </div>
  );
}
