export interface ProfitItem {
  menuItemId: string;
  name: string;
  quantity: number;
  profit: number;
}

export interface Analytics {
  sales: number;
  foodpandaSales: number;
  privateSales: number;
  successfulCount: number;
  cancelledCount: number;
  averageOrderValue: number;
  ingredientCost: number;
  packagingCost: number;
  labourCost: number;
  taxWithheld: number;
  foodpandaCharges: number;
  foodpandaCut: number;
  cutParts: {
    commission: number;
    sst: number;
    onlinePayment: number;
    waitingTime: number;
    tax: number;
    discountsFunded: number;
    notYetInvoiced: number;
  };
  expensesByCategory: Record<string, number>;
  stock: { purchased: number; usedInSales: number; wastage: number };
  totalOperatingCost: number;
  profit: number;
  daily: { date: string; sales: number; cost: number; profit: number }[];
  profitByItem: ProfitItem[];
  bestSellers: ProfitItem[];
  investment: { spent: number; allTimeProfit: number; paidBackPct: number | null };
}
