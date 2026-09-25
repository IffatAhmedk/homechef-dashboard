"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { PurchaseFields } from "@/components/PurchaseFields";
import { addIngredient } from "@/data/ingredients";
import { buyUnitsFor, purchaseInBase, todayISO, type PurchaseValues } from "@/lib/units";
import type { IngredientKind } from "@/models";

const UNIT_CHOICES = [
  { value: "g", label: "Grams (g)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "piece", label: "Pieces" },
  { value: "other", label: "Something else…" },
];

/** Add an ingredient together with the first thing you bought of it. */
export function AddIngredientModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [unitChoice, setUnitChoice] = useState("g");
  const [customUnit, setCustomUnit] = useState("");
  const [kind, setKind] = useState<IngredientKind>("FOOD");
  const [purchase, setPurchase] = useState<PurchaseValues>({ quantity: "", buyUnit: "kg", price: "", date: todayISO() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = unitChoice === "other" ? customUnit.trim() : unitChoice;

  function changeUnit(next: string) {
    setUnitChoice(next);
    setPurchase((p) => ({ ...p, buyUnit: buyUnitsFor(next === "other" ? customUnit : next)[0].value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!unit) return setError("Type the unit you count this in");

    const { quantity, total } = purchaseInBase(unit, purchase);
    setSaving(true);
    const result = await addIngredient({ name, unit, category: kind, purchase: { quantity, totalCost: total, date: purchase.date } });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not add the ingredient");
  }

  return (
    <Modal
      title="Add ingredient"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Flour" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <NativeSelect value={unitChoice} onChange={(e) => changeUnit(e.target.value)}>
            {UNIT_CHOICES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Kind">
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as IngredientKind)}>
            <option value="FOOD">Food</option>
            <option value="PACKAGING">Packaging</option>
          </NativeSelect>
        </Field>
      </div>

      {unitChoice === "other" && (
        <Field label="Unit name">
          <Input
            required
            value={customUnit}
            placeholder="e.g. packet, bottle"
            onChange={(e) => {
              setCustomUnit(e.target.value);
              setPurchase((p) => ({ ...p, buyUnit: e.target.value }));
            }}
          />
        </Field>
      )}

      <PurchaseFields unit={unit || "unit"} values={purchase} onChange={setPurchase} />

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
