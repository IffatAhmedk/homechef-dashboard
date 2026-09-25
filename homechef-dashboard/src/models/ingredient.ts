export type IngredientKind = "FOOD" | "PACKAGING";

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: IngredientKind;
  stockQty: number;
  /** True once a starting count or purchase has been logged. */
  tracked: boolean;
  daysLeft: number | null;
}

export type StockMovementType = "OPENING" | "PURCHASE" | "SALE" | "WASTAGE" | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  unitCost: number | null;
  date: string;
  note: string | null;
  order: { externalId: string | null; customer: { name: string } } | null;
}

/** What you can log by hand on the Update stock window. */
export type StockEntryType = "PURCHASE" | "COUNT" | "WASTAGE";
