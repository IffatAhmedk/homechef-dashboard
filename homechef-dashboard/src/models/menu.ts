import type { Ingredient } from "./ingredient";

export interface Category {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number;
  /** True when costPrice is worked out from the recipe and can't be typed in. */
  costIsAuto: boolean;
  isDeal: boolean;
  /** Own stock for normal items; for deals, how many can be made from the items inside. */
  availableQty: number;
  batchYield: number;
  stockQty: number;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
  _count: { recipeLines: number };
}

export interface RecipeLine {
  id: string;
  quantity: number;
  ingredient: Ingredient | null;
  componentItem: { id: string; name: string; costPrice: number } | null;
}
