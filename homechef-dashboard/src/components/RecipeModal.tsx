"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { useIngredients } from "@/data/ingredients";
import { saveRecipe, useRecipe } from "@/data/menu";
import { formatCurrency } from "@/lib/format";
import { buyUnitsFor, friendlyAmount } from "@/lib/units";
import type { Ingredient, MenuItem, RecipeLine } from "@/models";

/** One ingredient row as typed: which ingredient, how much, and in which unit. */
interface Row {
  key: number;
  ingredientId: string;
  amount: string;
  unit: string;
}

const emptyRow = (key: number): Row => ({ key, ingredientId: "", amount: "", unit: "" });
const money = (n: number) => (n < 10 ? `Rs ${n.toFixed(2)}` : formatCurrency(n));

/** Build a recipe: pick ingredients, say how much of each, how many servings it makes, and see the cost. */
export function RecipeModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { data: saved } = useRecipe(item.id);
  const { data: ingredients } = useIngredients();

  if (!saved || !ingredients) {
    return (
      <Modal title="Recipe" description={item.name} size="lg" onClose={onClose}>
        <p className="text-base text-ink-muted">Loading…</p>
      </Modal>
    );
  }
  return <RecipeEditor item={item} saved={saved} ingredients={ingredients} onClose={onClose} />;
}

interface RecipeEditorProps {
  item: MenuItem;
  saved: RecipeLine[];
  ingredients: Ingredient[];
  onClose: () => void;
}

function RecipeEditor({ item, saved, ingredients, onClose }: RecipeEditorProps) {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const [servings, setServings] = useState(String(item.batchYield > 0 ? item.batchYield : 1));
  const [rows, setRows] = useState<Row[]>(() => {
    const fromSaved = saved
      .filter((line) => line.ingredient)
      .map((line, i): Row => {
        const shown = friendlyAmount(line.ingredient!.unit, line.quantity);
        return { key: i + 1, ingredientId: line.ingredient!.id, amount: shown.amount, unit: shown.unit };
      });
    return fromSaved.length > 0 ? fromSaved : [emptyRow(1)];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedIds = new Set(rows.map((r) => r.ingredientId).filter(Boolean));

  function change(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function chooseIngredient(key: number, ingredientId: string) {
    const ingredient = byId.get(ingredientId);
    const biggestUnit = ingredient ? [...buyUnitsFor(ingredient.unit)].sort((a, b) => b.factor - a.factor)[0].value : "";
    change(key, { ingredientId, unit: biggestUnit });
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(Math.max(0, ...current.map((r) => r.key)) + 1)]);
  }

  function removeRow(key: number) {
    setRows((current) => (current.length === 1 ? [emptyRow(key)] : current.filter((r) => r.key !== key)));
  }

  /** The amount in the ingredient's own unit (1 kg of a gram-ingredient is 1000). */
  function amountInBase(row: Row) {
    const ingredient = byId.get(row.ingredientId);
    if (!ingredient) return 0;
    const units = buyUnitsFor(ingredient.unit);
    const unit = units.find((u) => u.value === row.unit) ?? units[0];
    return (Number(row.amount) || 0) * unit.factor;
  }

  const lines = rows
    .filter((r) => r.ingredientId && amountInBase(r) > 0)
    .map((r) => {
      const ingredient = byId.get(r.ingredientId)!;
      return { row: r, ingredient, base: amountInBase(r), cost: amountInBase(r) * ingredient.costPerUnit };
    });
  const servingCount = Math.max(1, Math.floor(Number(servings)) || 1);
  const batchCost = lines.reduce((sum, l) => sum + l.cost, 0);
  const packagingCost = lines.filter((l) => l.ingredient.category === "PACKAGING").reduce((sum, l) => sum + l.cost, 0);
  const unpriced = lines.filter((l) => l.ingredient.costPerUnit <= 0).map((l) => l.ingredient.name);

  async function save() {
    setError(null);
    if (lines.length === 0) return setError("Add at least one ingredient with an amount");
    setSaving(true);
    const result = await saveRecipe(item.id, {
      batchYield: servingCount,
      lines: lines.map((l) => ({ ingredientId: l.ingredient.id, quantity: l.base })),
    });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save the recipe");
  }

  const food = ingredients.filter((i) => i.category === "FOOD");
  const packaging = ingredients.filter((i) => i.category === "PACKAGING");
  const option = (i: Ingredient, rowIngredientId: string) => (
    <option key={i.id} value={i.id} disabled={usedIds.has(i.id) && i.id !== rowIngredientId}>
      {i.name} ({i.unit})
    </option>
  );

  return (
    <Modal
      title="Recipe"
      description={item.name}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save recipe"}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-label font-bold text-ink-muted">This recipe makes</span>
        <Input type="number" min="1" step="1" aria-label="Number of servings" value={servings} onChange={(e) => setServings(e.target.value)} className="w-24" />
        <span className="text-label font-bold text-ink-muted">servings</span>
      </div>
      <p className="-mt-2 text-caption text-ink-muted">
        Enter the amounts for the whole batch you cook. The cost of one serving is worked out by dividing by this number.
      </p>

      <div className="space-y-2">
        {rows.map((row) => {
          const ingredient = byId.get(row.ingredientId);
          const units = ingredient ? buyUnitsFor(ingredient.unit) : [];
          return (
            <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm bg-sunken p-2 sm:grid-cols-[minmax(0,1fr)_110px_100px_90px_auto]">
              <NativeSelect aria-label="Ingredient" value={row.ingredientId} onChange={(e) => chooseIngredient(row.key, e.target.value)} className="col-span-2 sm:col-span-1">
                <option value="">Choose an ingredient…</option>
                <optgroup label="Food">{food.map((i) => option(i, row.ingredientId))}</optgroup>
                {packaging.length > 0 && <optgroup label="Packaging">{packaging.map((i) => option(i, row.ingredientId))}</optgroup>}
              </NativeSelect>
              <Input type="number" min="0" step="any" placeholder="How much?" aria-label="Amount" value={row.amount} onChange={(e) => change(row.key, { amount: e.target.value })} />
              {units.length > 1 ? (
                <NativeSelect aria-label="Unit" value={row.unit} onChange={(e) => change(row.key, { unit: e.target.value })}>
                  {units.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <span className="px-2 text-base text-ink-muted">{ingredient?.unit}</span>
              )}
              <p className={`text-right text-base font-bold ${ingredient && ingredient.costPerUnit <= 0 ? "text-warn" : "text-ink"}`}>
                {ingredient ? (ingredient.costPerUnit <= 0 ? "No price" : money(amountInBase(row) * ingredient.costPerUnit)) : ""}
              </p>
              <Button variant="destructive" size="sm" onClick={() => removeRow(row.key)}>
                <Trash2 size={16} strokeWidth={2.4} /> Remove
              </Button>
            </div>
          );
        })}
        <Button variant="secondary" onClick={addRow}>
          <Plus size={16} strokeWidth={2.4} /> Add ingredient
        </Button>
      </div>

      {unpriced.length > 0 && (
        <p className="rounded-sm bg-warn-soft px-4 py-3 text-base text-warn">
          {unpriced.join(", ")} {unpriced.length === 1 ? "has" : "have"} no price yet, so the cost can&apos;t be worked out automatically. Log a purchase on the
          Ingredients page, or type the cost by hand.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-leaf-soft p-4 sm:grid-cols-3">
        <Summary label="Whole batch costs" value={formatCurrency(batchCost)} />
        <Summary label="Servings" value={String(servingCount)} />
        <Summary
          label="Cost of one serving"
          value={money(batchCost / servingCount)}
          strong
          note={packagingCost > 0 ? `Includes ${money(packagingCost / servingCount)} packaging` : undefined}
        />
      </div>

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}

function Summary({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-caption text-ink-muted">{label}</p>
      <p className={`text-2xl font-bold ${strong ? "text-leaf" : "text-ink"}`}>{value}</p>
      {note && <p className="text-caption text-ink-muted">{note}</p>}
    </div>
  );
}
