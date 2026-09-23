"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save, Upload, PackagePlus, History, AlertTriangle } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import IngredientsImportModal from "./import-modal";
import StockModal, { StockHistoryModal, StockIngredient } from "./stock-modal";
import { Badge } from "@/components/ui";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: "FOOD" | "PACKAGING";
  stockQty: number;
  tracked: boolean;
  daysLeft: number | null;
}

function fmtQty(n: number) {
  return Number(n.toFixed(2)).toLocaleString("en-PK");
}

function lasts(ing: Ingredient) {
  if (!ing.tracked) return "—";
  if (ing.stockQty <= 0) return "Out of stock";
  if (ing.daysLeft == null) return "No recent use";
  if (ing.daysLeft < 1) return "Less than a day";
  return `About ${Math.round(ing.daysLeft)} day${Math.round(ing.daysLeft) === 1 ? "" : "s"}`;
}

export default function IngredientsPage() {
  const { data: ingredients = [] } = useSWR<Ingredient[]>("/api/ingredients", fetcher);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [stockFor, setStockFor] = useState<StockIngredient | null>(null);
  const [historyFor, setHistoryFor] = useState<StockIngredient | null>(null);
  const [newIngredient, setNewIngredient] = useState<{ name: string; unit: string; costPerUnit: string; category: "FOOD" | "PACKAGING" }>({
    name: "",
    unit: "",
    costPerUnit: "",
    category: "FOOD",
  });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDraft(ingredient: Ingredient) {
    const draft = drafts[ingredient.id];
    setSavingId(ingredient.id);
    await fetch(`/api/ingredients/${ingredient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costPerUnit: Number(draft) }),
    });
    await mutate("/api/ingredients");
    await mutate("/api/menu");
    setSavingId(null);
  }

  async function toggleCategory(ingredient: Ingredient) {
    const category = ingredient.category === "FOOD" ? "PACKAGING" : "FOOD";
    await fetch(`/api/ingredients/${ingredient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    await mutate("/api/ingredients");
    await mutate("/api/menu");
  }

  async function deleteIngredient(id: string) {
    if (!confirm("Delete this ingredient?")) return;
    const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    await mutate("/api/ingredients");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newIngredient.name,
        unit: newIngredient.unit,
        costPerUnit: Number(newIngredient.costPerUnit),
        category: newIngredient.category,
      }),
    });
    if (res.ok) {
      await mutate("/api/ingredients");
      setNewIngredient({ name: "", unit: "", costPerUnit: "", category: "FOOD" });
      setShowAdd(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add ingredient");
    }
    setAdding(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-ink">Ingredients</h1>
          <p className="text-sm text-ink-muted">
            Ingredients and packaging: what they cost, what you have, and how long it will last. Prices follow your purchases and feed menu item costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-pill border border-control bg-card px-5 text-label font-bold text-ink-muted hover:bg-sunken"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90"
          >
            <Plus size={16} /> Add ingredient
          </button>
        </div>
      </div>

      {(() => {
        const low = ingredients.filter((i) => i.tracked && (i.stockQty <= 0 || (i.daysLeft != null && i.daysLeft <= 7)));
        const trackedCount = ingredients.filter((i) => i.tracked).length;
        return (
          <section className="rounded-lg bg-card p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-xl text-ink">
              <AlertTriangle size={18} strokeWidth={2.2} className="text-warn" /> Running low
            </h2>
            {trackedCount === 0 ? (
              <p className="text-base text-ink-muted">
                Tell the app what you have today with Update stock on each ingredient. From then on, every sale uses up
                ingredients through its recipe and this list shows what is running out.
              </p>
            ) : low.length === 0 ? (
              <p className="text-base text-ink-muted">Nothing is running low. Everything lasts more than a week at the current pace.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {low.map((i) => (
                  <li key={i.id}>
                    <Badge tone={i.stockQty <= 0 ? "bad" : "warn"}>
                      {i.name}: {i.stockQty <= 0 ? "out of stock" : `${lasts(i).toLowerCase()} (${fmtQty(i.stockQty)} ${i.unit} left)`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })()}

      {showAdd && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 rounded-lg border border-brand bg-sunken p-4 sm:grid-cols-4">
          <input
            required
            placeholder="Name (e.g. Flour)"
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            placeholder="Unit (e.g. g, ml, piece)"
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Cost per unit"
            value={newIngredient.costPerUnit}
            onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
          />
          <select
            value={newIngredient.category}
            onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value as "FOOD" | "PACKAGING" })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
          >
            <option value="FOOD">Food</option>
            <option value="PACKAGING">Packaging</option>
          </select>
          {error && <p className="text-sm text-danger sm:col-span-4">{error}</p>}
          <button
            type="submit"
            disabled={adding}
            className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50 sm:col-span-4"
          >
            {adding ? "Adding…" : "Add ingredient"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Unit</th>
              <th className="px-4 py-3 font-bold">Cost per unit</th>
              <th className="px-4 py-3 font-bold">In stock</th>
              <th className="px-4 py-3 font-bold">Lasts</th>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ingredients.map((ing) => {
              const draft = drafts[ing.id] ?? String(ing.costPerUnit);
              const dirty = draft !== String(ing.costPerUnit);
              return (
                <tr key={ing.id}>
                  <td className="px-4 py-3 font-bold text-ink">{ing.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{ing.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-ink-muted">Rs</span>
                      <input
                        type="number"
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [ing.id]: e.target.value }))}
                        className="w-20 rounded border border-line px-2 py-1 text-sm"
                      />
                      <span className="text-xs text-ink-muted">/ {ing.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {ing.tracked ? (
                      <span className={`font-bold ${ing.stockQty <= 0 ? "text-danger" : "text-ink"}`}>
                        {fmtQty(ing.stockQty)} {ing.unit}
                      </span>
                    ) : (
                      <Badge tone="warn">Not counted yet</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{lasts(ing)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleCategory(ing)}
                      className={`rounded-pill px-2 py-0.5 text-xs font-bold ${
                        ing.category === "PACKAGING" ? "bg-sunken text-ink-muted" : "bg-leaf-soft text-leaf"
                      }`}
                    >
                      {ing.category === "PACKAGING" ? "Packaging" : "Food"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {dirty && (
                        <button
                          onClick={() => saveDraft(ing)}
                          disabled={savingId === ing.id}
                          className="flex items-center gap-1 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
                        >
                          <Save size={12} /> Save
                        </button>
                      )}
                      <button
                        onClick={() => setStockFor(ing)}
                        className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-brand hover:bg-brand-soft"
                      >
                        <PackagePlus size={16} strokeWidth={2.4} /> Update stock
                      </button>
                      <button
                        onClick={() => setHistoryFor(ing)}
                        className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-brand hover:bg-brand-soft"
                      >
                        <History size={16} strokeWidth={2.4} /> History
                      </button>
                      <button
                        onClick={() => deleteIngredient(ing.id)}
                        className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft"
                      >
                        <Trash2 size={16} strokeWidth={2.4} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ingredients.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">No ingredients yet.</p>}
      </div>
      {stockFor && <StockModal ingredient={stockFor} onClose={() => setStockFor(null)} />}
      {historyFor && <StockHistoryModal ingredient={historyFor} onClose={() => setHistoryFor(null)} />}
      {showImport && <IngredientsImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
