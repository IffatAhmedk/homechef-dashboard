"use client";

import { formatCurrency } from "@/lib/format";
import { buyUnitsFor, purchaseInBase, todayISO, type PurchaseValues } from "@/lib/units";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface PurchaseFieldsProps {
  /** The unit the ingredient is kept in (g, ml, piece…). */
  unit: string;
  values: PurchaseValues;
  onChange: (next: PurchaseValues) => void;
}

/** How much, price paid, unit price (worked out) and date — used when adding an ingredient and when logging a purchase. */
export function PurchaseFields({ unit, values, onChange }: PurchaseFieldsProps) {
  const options = buyUnitsFor(unit);
  const { chosen, unitPrice } = purchaseInBase(unit, values);
  const set = (change: Partial<PurchaseValues>) => onChange({ ...values, ...change });
  const boughtEarlier = values.date && values.date < todayISO();

  return (
    <>
      <Field label="How much did you buy?" group>
        <div className="flex gap-2">
          <Input
            required
            type="number"
            min="0"
            step="any"
            aria-label="Amount bought"
            value={values.quantity}
            onChange={(e) => set({ quantity: e.target.value })}
          />
          {options.length > 1 ? (
            <NativeSelect aria-label="Unit bought in" value={chosen.value} onChange={(e) => set({ buyUnit: e.target.value })} className="w-36">
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <span className="flex items-center px-2 text-base text-ink-muted">{chosen.label}</span>
          )}
        </div>
      </Field>

      <Field label="Price paid (Rs)">
        <Input required type="number" min="0" step="any" value={values.price} onChange={(e) => set({ price: e.target.value })} />
      </Field>

      <div className="rounded-sm bg-sunken px-4 py-3">
        <p className="text-caption text-ink-muted">Unit price (worked out for you)</p>
        <p className="text-lg font-bold text-ink">{unitPrice != null ? `Rs ${unitPrice.toFixed(unitPrice < 1 ? 3 : 2)} per ${unit}` : "—"}</p>
        {unitPrice != null && chosen.factor > 1 && (
          <p className="text-caption text-ink-muted">
            That is {formatCurrency(unitPrice * chosen.factor)} per {chosen.label === "litres" ? "litre" : chosen.label}
          </p>
        )}
      </div>

      <Field label="Date bought">
        <Input type="date" max={todayISO()} value={values.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      {boughtEarlier && (
        <p className="rounded-sm bg-warn-soft px-4 py-3 text-base text-warn">
          Bought earlier and not logged? That works. Orders since {values.date} will be taken out of this stock automatically, so what you see is what should be
          left today.
        </p>
      )}
    </>
  );
}
