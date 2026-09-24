"use client";

import { useState } from "react";
import { mutate } from "swr";
import { X } from "lucide-react";
import { btnPrimary } from "@/components/ui";
import PurchaseFields, { PurchaseValues, buyUnitsFor, purchaseInBase, todayISO } from "./purchase-fields";

const UNIT_CHOICES = [
  { value: "g", label: "Grams (g)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "piece", label: "Pieces" },
  { value: "other", label: "Something else…" },
];

export default function AddIngredientModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [unitChoice, setUnitChoice] = useState("g");
  const [customUnit, setCustomUnit] = useState("");
  const [category, setCategory] = useState<"FOOD" | "PACKAGING">("FOOD");
  const [purchase, setPurchase] = useState<PurchaseValues>({ quantity: "", buyUnit: "", price: "", date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = unitChoice === "other" ? customUnit.trim() : unitChoice;

  function changeUnit(next: string) {
    setUnitChoice(next);
    setPurchase((p) => ({ ...p, buyUnit: buyUnitsFor(next === "other" ? customUnit : next)[0].value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unit) {
      setError("Type the unit you count this in");
      return;
    }
    const { quantity, total } = purchaseInBase(unit, purchase);
    setSaving(true);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        unit,
        category,
        purchase: { quantity, totalCost: total, date: purchase.date },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Could not add the ingredient");
      return;
    }
    await mutate("/api/ingredients");
    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Add ingredient</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block text-label font-bold text-ink-muted">
            Name
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flour" className="mt-1 w-full" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-label font-bold text-ink-muted">
              Unit
              <select value={unitChoice} onChange={(e) => changeUnit(e.target.value)} className="mt-1 w-full">
                {UNIT_CHOICES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-label font-bold text-ink-muted">
              Kind
              <select value={category} onChange={(e) => setCategory(e.target.value as "FOOD" | "PACKAGING")} className="mt-1 w-full">
                <option value="FOOD">Food</option>
                <option value="PACKAGING">Packaging</option>
              </select>
            </label>
          </div>

          {unitChoice === "other" && (
            <label className="block text-label font-bold text-ink-muted">
              Unit name
              <input
                required
                value={customUnit}
                onChange={(e) => {
                  setCustomUnit(e.target.value);
                  setPurchase((p) => ({ ...p, buyUnit: e.target.value }));
                }}
                placeholder="e.g. packet, bottle"
                className="mt-1 w-full"
              />
            </label>
          )}

          <PurchaseFields unit={unit || "unit"} values={purchase} onChange={setPurchase} />

          {error && <p className="text-base text-danger">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className="rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
