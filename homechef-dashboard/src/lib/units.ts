export interface BuyUnit {
  value: string;
  label: string;
  /** How many of the ingredient's own unit one of these is (1 kg = 1000 g). */
  factor: number;
}

/** The units you can say an amount in, given the unit an ingredient is kept in. */
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

/** Shows a stored amount in the friendliest unit, e.g. 1500 g as 1.5 kg. */
export function friendlyAmount(unit: string, base: number) {
  const options = [...buyUnitsFor(unit)].sort((a, b) => b.factor - a.factor);
  const pick = options.find((o) => base >= o.factor) ?? options[options.length - 1];
  return { amount: String(Number((base / pick.factor).toFixed(3))), unit: pick.value };
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** What was typed into a purchase form. */
export interface PurchaseValues {
  quantity: string;
  buyUnit: string;
  price: string;
  date: string;
}

/** The purchase in the ingredient's own unit, with the price per unit worked out. */
export function purchaseInBase(unit: string, values: PurchaseValues) {
  const options = buyUnitsFor(unit);
  const chosen = options.find((o) => o.value === values.buyUnit) ?? options[0];
  const quantity = Number(values.quantity) * chosen.factor;
  const total = Number(values.price);
  return { quantity, total, chosen, unitPrice: quantity > 0 && total > 0 ? total / quantity : null };
}

export function formatQuantity(n: number) {
  return Number(n.toFixed(2)).toLocaleString("en-PK");
}
