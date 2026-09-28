import type { Analytics } from "@/models";

export const PREVIEW_COOKIE = "rozana-preview";

const emptyAnalytics: Analytics = {
  sales: 0,
  foodpandaSales: 0,
  privateSales: 0,
  successfulCount: 0,
  cancelledCount: 0,
  averageOrderValue: 0,
  ingredientCost: 0,
  packagingCost: 0,
  labourCost: 0,
  taxWithheld: 0,
  foodpandaCharges: 0,
  foodpandaCut: 0,
  cutParts: { commission: 0, sst: 0, onlinePayment: 0, waitingTime: 0, tax: 0, discountsFunded: 0, notYetInvoiced: 0 },
  expensesByCategory: {},
  stock: { purchased: 0, usedInSales: 0, wastage: 0 },
  totalOperatingCost: 0,
  profit: 0,
  daily: [],
  profitByItem: [],
  bestSellers: [],
  investment: { spent: 0, allTimeProfit: 0, paidBackPct: null },
};

/** What the API returns in preview mode: no real data, ever. Numbers are zero and every list is empty. */
export function previewData(pathname: string) {
  return pathname === "/api/analytics" ? emptyAnalytics : [];
}
