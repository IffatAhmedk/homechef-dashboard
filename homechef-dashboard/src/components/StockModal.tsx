"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { PillGroup } from "@/components/PillGroup";
import { PurchaseFields } from "@/components/PurchaseFields";
import { logStock } from "@/data/ingredients";
import { buyUnitsFor, formatQuantity, purchaseInBase, todayISO, type PurchaseValues } from "@/lib/units";
import type { Ingredient, StockEntryType } from "@/models";

const CHOICES: { value: StockEntryType; label: string }[] = [
  { value: "PURCHASE", label: "Bought" },
  { value: "COUNT", label: "Counted" },
  { value: "WASTAGE", label: "Wasted or spoiled" },
];

/** Log stock by hand: something you bought, a count of what you have, or something lost. */
export function StockModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [choice, setChoice] = useState<StockEntryType>(ingredient.tracked ? "PURCHASE" : "COUNT");
  const [purchase, setPurchase] = useState<PurchaseValues>({
    quantity: "",
    buyUnit: buyUnitsFor(ingredient.unit)[0].value,
    price: "",
    date: todayISO(),
  });
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bought = purchaseInBase(ingredient.unit, purchase);
  const onHand = Math.max(0, ingredient.stockQty);
  const averagePrice =
    bought.unitPrice == null
      ? null
      : onHand > 0
        ? (onHand * ingredient.costPerUnit + bought.quantity * bought.unitPrice) / (onHand + bought.quantity)
        : bought.unitPrice;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await logStock(ingredient.id, {
      type: choice,
      quantity: choice === "PURCHASE" ? bought.quantity : Number(quantity),
      totalCost: choice === "PURCHASE" ? bought.total : undefined,
      unitCost: choice === "COUNT" && unitCost !== "" ? Number(unitCost) : undefined,
      date: choice === "PURCHASE" ? purchase.date : choice === "WASTAGE" ? date : undefined,
      note: note || undefined,
    });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save");
  }

  return (
    <Modal
      title={ingredient.name}
      description={
        ingredient.tracked
          ? `${formatQuantity(ingredient.stockQty)} ${ingredient.unit} in stock now`
          : "Stock not counted yet — start with what you have today"
      }
      size="sm"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <PillGroup label="What happened" options={CHOICES} value={choice} onChange={setChoice} />

      {choice === "PURCHASE" ? (
        <PurchaseFields unit={ingredient.unit} values={purchase} onChange={setPurchase} />
      ) : (
        <Field label={choice === "COUNT" ? `How much do you have now? (${ingredient.unit})` : `How much was lost? (${ingredient.unit})`}>
          <Input required type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
      )}

      {choice === "COUNT" && !ingredient.tracked && (
        <Field label={`Cost per ${ingredient.unit} (Rs)`} hint={ingredient.costPerUnit > 0 ? "Leave blank to keep the current price." : "Optional."}>
          <Input type="number" min="0" step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
        </Field>
      )}

      {choice === "WASTAGE" && (
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}

      <Field label="Note (optional)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {choice === "PURCHASE" && averagePrice != null && (
        <p className="rounded-sm bg-sunken p-3 text-base text-ink">
          {ingredient.stockQty > 0
            ? `With the ${formatQuantity(ingredient.stockQty)} ${ingredient.unit} you already have (at ${ingredient.costPerUnit.toFixed(2)}), the average price becomes ${averagePrice.toFixed(2)} per ${ingredient.unit}.`
            : `The price will be set to ${averagePrice.toFixed(2)} per ${ingredient.unit}.`}
        </p>
      )}
      {choice === "COUNT" && ingredient.tracked && quantity !== "" && (
        <p className="rounded-sm bg-sunken p-3 text-base text-ink">
          This changes stock by {formatQuantity(Number(quantity) - ingredient.stockQty)} {ingredient.unit} to match what you counted.
        </p>
      )}

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
