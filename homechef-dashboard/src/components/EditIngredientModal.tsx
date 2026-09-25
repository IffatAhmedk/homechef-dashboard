"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { updateIngredient } from "@/data/ingredients";
import type { Ingredient, IngredientKind } from "@/models";

/** Change an ingredient's name, kind, unit (until stock is logged) or price. */
export function EditIngredientModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [name, setName] = useState(ingredient.name);
  const [unit, setUnit] = useState(ingredient.unit);
  const [kind, setKind] = useState<IngredientKind>(ingredient.category);
  const [price, setPrice] = useState(String(ingredient.costPerUnit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateIngredient(ingredient.id, {
      name: name.trim(),
      category: kind,
      ...(unit.trim() !== ingredient.unit && { unit: unit.trim() }),
      ...(Number(price) !== ingredient.costPerUnit && { costPerUnit: Number(price) }),
    });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save");
  }

  return (
    <Modal
      title="Edit ingredient"
      size="sm"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <Input required value={unit} onChange={(e) => setUnit(e.target.value)} disabled={ingredient.tracked} />
        </Field>
        <Field label="Kind">
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as IngredientKind)}>
            <option value="FOOD">Food</option>
            <option value="PACKAGING">Packaging</option>
          </NativeSelect>
        </Field>
      </div>
      {ingredient.tracked && (
        <p className="text-caption text-ink-muted">The unit is locked because stock has been logged in it. Add a new ingredient if you need a different unit.</p>
      )}

      <Field label={`Price per ${ingredient.unit} (Rs)`} hint="The price normally follows your purchases. Change it here only to correct a mistake.">
        <Input required type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
