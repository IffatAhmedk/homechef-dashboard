"use client";

import { formatCurrency } from "@/lib/format";

export interface PurchaseValues {
  quantity: string;
  buyUnit: string;
  price: string;
  date: string;
}

export interface BuyUnit {
  value: string;
  label: string;
  /** How many of the ingredient's own unit one of these is (1 kg = 1000 g). */
  factor: number;
}

/** The units you can say a purchase in, given the unit the ingredient is tracked in. */
export function buyUnitsFor(unit: string): BuyUnit[] {
  const u = unit.trim().toLowerCase();
  if (["g", "gram", "grams"].includes(u)) {
    return [
      { value: "kg", label: "kg", factor: 1000 },
      { value: "g", label: "g", factor: 1 },
    ];
  }
  if (["ml", "millilitre", "milliliter", "millilitres"].includes(u)) {
    return [
      { value: "l", label: "litres", factor: 1000 },
      { value: "ml", label: "ml", factor: 1 },
    ];
  }
  if (["piece", "pieces", "pc", "pcs"].includes(u)) {
    return [
      { value: "piece", label: "pieces", factor: 1 },
      { value: "dozen", label: "dozen", factor: 12 },
    ];
  }
  return [{ value: unit, label: unit, factor: 1 }];
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Quantity in the ingredient's own unit, and the total paid, from what was typed in. */
export function purchaseInBase(unit: string, v: PurchaseValues) {
  const opts = buyUnitsFor(unit);
  const chosen = opts.find((o) => o.value === v.buyUnit) ?? opts[0];
  const quantity = Number(v.quantity) * chosen.factor;
  const total = Number(v.price);
  return { quantity, total, chosen, unitPrice: quantity > 0 && total > 0 ? total / quantity : null };
}

export default function PurchaseFields({
  unit,
  values,
  onChange,
}: {
  unit: string;
  values: PurchaseValues;
  onChange: (next: PurchaseValues) => void;
}) {
  const opts = buyUnitsFor(unit);
  const { chosen, unitPrice } = purchaseInBase(unit, values);
  const set = (patch: Partial<PurchaseValues>) => onChange({ ...values, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-label font-bold text-ink-muted" htmlFor="buy-qty">
          How much did you buy?
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="buy-qty"
            required
            type="number"
            min="0"
            step="any"
            value={values.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
            className="min-w-0 flex-1"
          />
          {opts.length > 1 ? (
            <select
              aria-label="Unit bought in"
              value={chosen.value}
              onChange={(e) => set({ buyUnit: e.target.value })}
              className="w-32"
            >
              {opts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex items-center px-2 text-base text-ink-muted">{chosen.label}</span>
          )}
        </div>
      </div>

      <label className="block text-label font-bold text-ink-muted">
        Price paid (Rs)
        <input
          required
          type="number"
          min="0"
          step="any"
          value={values.price}
          onChange={(e) => set({ price: e.target.value })}
          className="mt-1 w-full"
        />
      </label>

      <div className="rounded-sm bg-sunken px-4 py-3">
        <p className="text-caption text-ink-muted">Unit price (worked out for you)</p>
        <p className="text-lg font-bold text-ink">
          {unitPrice != null ? `Rs ${unitPrice.toFixed(unitPrice < 1 ? 3 : 2)} per ${unit}` : "—"}
        </p>
        {unitPrice != null && chosen.factor > 1 && (
          <p className="text-caption text-ink-muted">
            That is {formatCurrency(unitPrice * chosen.factor)} per {chosen.label === "litres" ? "litre" : chosen.label}
          </p>
        )}
      </div>

      <label className="block text-label font-bold text-ink-muted">
        Date bought
        <input type="date" value={values.date} max={todayISO()} onChange={(e) => set({ date: e.target.value })} className="mt-1 w-full" />
      </label>
      {values.date && values.date < todayISO() && (
        <p className="rounded-sm bg-warn-soft px-4 py-3 text-base text-warn">
          Bought earlier and not logged? That works. Orders since {values.date} will be taken out of this stock
          automatically, so what you see is what should be left today.
        </p>
      )}
    </div>
  );
}
