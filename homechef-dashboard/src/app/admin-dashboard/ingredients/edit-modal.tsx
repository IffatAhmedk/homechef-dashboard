"use client";

import { useState } from "react";
import { mutate } from "swr";
import { X } from "lucide-react";
import { btnPrimary } from "@/components/ui";

export interface EditableIngredient {
  id: string;
  name: string;
  unit: string;
  category: "FOOD" | "PACKAGING";
  costPerUnit: number;
  tracked: boolean;
}

export default function EditIngredientModal({ ingredient, onClose }: { ingredient: EditableIngredient; onClose: () => void }) {
  const [name, setName] = useState(ingredient.name);
  const [unit, setUnit] = useState(ingredient.unit);
  const [category, setCategory] = useState(ingredient.category);
  const [costPerUnit, setCostPerUnit] = useState(String(ingredient.costPerUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/ingredients/${ingredient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category,
        ...(unit.trim() !== ingredient.unit && { unit: unit.trim() }),
        ...(Number(costPerUnit) !== ingredient.costPerUnit && { costPerUnit: Number(costPerUnit) }),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not save");
      return;
    }
    await mutate("/api/ingredients");
    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Edit ingredient</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block text-label font-bold text-ink-muted">
            Name
            <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-label font-bold text-ink-muted">
              Unit
              <input
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={ingredient.tracked}
                className="mt-1 w-full disabled:opacity-60"
              />
            </label>
            <label className="block text-label font-bold text-ink-muted">
              Kind
              <select value={category} onChange={(e) => setCategory(e.target.value as "FOOD" | "PACKAGING")} className="mt-1 w-full">
                <option value="FOOD">Food</option>
                <option value="PACKAGING">Packaging</option>
              </select>
            </label>
          </div>
          {ingredient.tracked && (
            <p className="text-caption text-ink-muted">
              The unit is locked because stock has been logged in it. Add a new ingredient if you need a different unit.
            </p>
          )}
          <label className="block text-label font-bold text-ink-muted">
            Price per {ingredient.unit} (Rs)
            <input
              required
              type="number"
              min="0"
              step="any"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="mt-1 w-full"
            />
          </label>
          <p className="text-caption text-ink-muted">
            The price normally follows your purchases. Change it here only to correct a mistake.
          </p>
          {error && <p className="text-base text-danger">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className="rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
