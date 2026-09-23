"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import IngredientsImportModal from "./import-modal";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: "FOOD" | "PACKAGING";
}

export default function IngredientsPage() {
  const { data: ingredients = [] } = useSWR<Ingredient[]>("/api/ingredients", fetcher);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
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
          <h1 className="text-xl font-semibold text-charcoal">Ingredients</h1>
          <p className="text-sm text-charcoal/50">
            Base ingredients and their cost. Used to calculate menu item cost automatically from recipes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-warm-beige/60 bg-white px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-cream"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add ingredient
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 rounded-xl border border-terracotta/30 bg-warm-beige/20 p-4 sm:grid-cols-4">
          <input
            required
            placeholder="Name (e.g. Flour)"
            value={newIngredient.name}
            onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            placeholder="Unit (e.g. g, ml, piece)"
            value={newIngredient.unit}
            onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Cost per unit"
            value={newIngredient.costPerUnit}
            onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <select
            value={newIngredient.category}
            onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value as "FOOD" | "PACKAGING" })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          >
            <option value="FOOD">Food</option>
            <option value="PACKAGING">Packaging</option>
          </select>
          {error && <p className="text-sm text-maroon sm:col-span-4">{error}</p>}
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:col-span-4"
          >
            {adding ? "Adding…" : "Add ingredient"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-warm-beige/40 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-beige/30 text-left text-xs uppercase text-charcoal/40">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Cost per unit</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-beige/20">
            {ingredients.map((ing) => {
              const draft = drafts[ing.id] ?? String(ing.costPerUnit);
              const dirty = draft !== String(ing.costPerUnit);
              return (
                <tr key={ing.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">{ing.name}</td>
                  <td className="px-4 py-3 text-charcoal/60">{ing.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-charcoal/40">Rs</span>
                      <input
                        type="number"
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [ing.id]: e.target.value }))}
                        className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-sm"
                      />
                      <span className="text-xs text-charcoal/40">/ {ing.unit}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleCategory(ing)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ing.category === "PACKAGING" ? "bg-warm-beige/40 text-charcoal/70" : "bg-sage/10 text-sage"
                      }`}
                    >
                      {ing.category === "PACKAGING" ? "Packaging" : "Food"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {dirty && (
                        <button
                          onClick={() => saveDraft(ing)}
                          disabled={savingId === ing.id}
                          className="flex items-center gap-1 rounded-lg bg-terracotta px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          <Save size={12} /> Save
                        </button>
                      )}
                      <button
                        onClick={() => deleteIngredient(ing.id)}
                        className="rounded-lg p-1.5 text-charcoal/40 hover:bg-maroon/10 hover:text-maroon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ingredients.length === 0 && <p className="p-6 text-center text-sm text-charcoal/40">No ingredients yet.</p>}
      </div>
      {showImport && <IngredientsImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
