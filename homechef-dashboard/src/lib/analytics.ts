import { prisma } from "@/lib/prisma";
import { orderFinancials, itemFinancials } from "@/lib/finance";
import { eachDay } from "@/lib/date-range";

interface OrderRow {
  channel: "DIRECT" | "FOODPANDA";
  status: string;
  totalAmount: number;
  createdAt: Date;
  costOverride: number | null;
  platformCutOverride: number | null;
  salesTaxCollection: number | null;
  incomeTaxWithholding: number | null;
  salesTaxWithholding: number | null;
  discountPaidByRestaurant: number | null;
  voucherPaidByRestaurant: number | null;
  commission: number | null;
  waitingTimeFee: number | null;
  sstOnCommission: number | null;
  onlinePaymentFee: number | null;
  items: { menuItemId: string; quantity: number; priceAtSale: number; costAtSale: number; packagingCostAtSale: number }[];
}

type DailyBucket = { sales: number; cost: number };
type CutParts = { commission: number; sst: number; onlinePayment: number; waitingTime: number; tax: number; discountsFunded: number; notYetInvoiced: number };

interface OrderAggregate {
  sales: number;
  foodpandaSales: number;
  privateSales: number;
  cogs: number;
  ingredientCost: number;
  packagingCost: number;
  foodpandaCut: number;
  taxWithheld: number;
  foodpandaCharges: number;
  cutParts: CutParts;
}

/** Sums per-order financials into period totals, the Foodpanda-cut breakdown, and the daily sales/cost series. */
function aggregateOrders(orders: OrderRow[], dailyMap: Map<string, DailyBucket>): OrderAggregate {
  const result: OrderAggregate = {
    sales: 0,
    foodpandaSales: 0,
    privateSales: 0,
    cogs: 0,
    ingredientCost: 0,
    packagingCost: 0,
    foodpandaCut: 0,
    taxWithheld: 0,
    foodpandaCharges: 0,
    cutParts: { commission: 0, sst: 0, onlinePayment: 0, waitingTime: 0, tax: 0, discountsFunded: 0, notYetInvoiced: 0 },
  };

  for (const order of orders) {
    const fin = orderFinancials(order);
    result.sales += fin.revenue;
    result.cogs += fin.cost;
    result.ingredientCost += fin.ingredientCost;
    result.packagingCost += fin.packagingCost;
    result.foodpandaCut += fin.platformCut;

    if (order.channel === "FOODPANDA") {
      result.foodpandaSales += fin.revenue;
      result.taxWithheld += (order.salesTaxCollection ?? 0) + (order.incomeTaxWithholding ?? 0) + (order.salesTaxWithholding ?? 0);
      result.foodpandaCharges += (order.commission ?? 0) + (order.sstOnCommission ?? 0) + (order.onlinePaymentFee ?? 0) + (order.waitingTimeFee ?? 0);
      if (order.commission != null) {
        const tax = (order.salesTaxCollection ?? 0) + (order.incomeTaxWithholding ?? 0) + (order.salesTaxWithholding ?? 0);
        const funded = (order.discountPaidByRestaurant ?? 0) + (order.voucherPaidByRestaurant ?? 0);
        const parts = (order.commission ?? 0) + (order.sstOnCommission ?? 0) + (order.onlinePaymentFee ?? 0) + (order.waitingTimeFee ?? 0) + tax + funded;
        result.cutParts.commission += order.commission ?? 0;
        result.cutParts.sst += order.sstOnCommission ?? 0;
        result.cutParts.onlinePayment += order.onlinePaymentFee ?? 0;
        result.cutParts.waitingTime += order.waitingTimeFee ?? 0;
        result.cutParts.tax += tax;
        result.cutParts.discountsFunded += funded;
        // Rounding leftovers between the invoice lines and order amount minus payable.
        result.cutParts.notYetInvoiced += Math.abs(fin.platformCut - parts) < 1 ? 0 : fin.platformCut - parts;
      } else {
        result.cutParts.notYetInvoiced += fin.platformCut;
      }
    } else {
      result.privateSales += fin.revenue;
    }

    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.sales += fin.revenue;
      bucket.cost += fin.cost + fin.platformCut;
    }
  }

  return result;
}

interface ItemTotal {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
}

function aggregateItemTotals(orders: OrderRow[]): Map<string, ItemTotal> {
  const itemTotals = new Map<string, ItemTotal>();
  for (const order of orders) {
    for (const oi of order.items) {
      const itemFin = itemFinancials(oi, order.channel);
      const key = oi.menuItemId;
      const existing = itemTotals.get(key) ?? { name: "", quantity: 0, revenue: 0, cost: 0 };
      existing.quantity += oi.quantity;
      existing.revenue += itemFin.revenue;
      existing.cost += itemFin.cost + itemFin.platformCut;
      itemTotals.set(key, existing);
    }
  }
  return itemTotals;
}

function buildProfitByItem(itemTotals: Map<string, ItemTotal>, nameById: Map<string, string>) {
  return Array.from(itemTotals.entries())
    .map(([id, v]) => ({
      menuItemId: id,
      name: nameById.get(id) ?? "Unknown item",
      quantity: v.quantity,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
      marginPct: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}

function aggregateExpenses(expenses: { amount: number; category: string; date: Date }[], dailyMap: Map<string, DailyBucket>) {
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByCategory: Record<string, number> = {};
  for (const expense of expenses) {
    expensesByCategory[expense.category] = (expensesByCategory[expense.category] ?? 0) + expense.amount;
    const key = expense.date.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) bucket.cost += expense.amount;
  }
  const labourCost = expensesByCategory["LABOUR"] ?? 0;
  const otherExpenses = expenseTotal - labourCost - (expensesByCategory["PACKAGING"] ?? 0) - (expensesByCategory["INGREDIENTS"] ?? 0);
  return { expenseTotal, expensesByCategory, labourCost, otherExpenses };
}

/** All-time "paid back" progress against startup + packaging investment — not scoped to the selected period. */
function computeAllTimeProgress(allTimeOrders: OrderRow[], investmentExpenses: { amount: number }[]) {
  let allTimeSales = 0;
  let allTimeCost = 0;
  for (const order of allTimeOrders) {
    const fin = orderFinancials(order);
    allTimeSales += fin.revenue;
    allTimeCost += fin.cost + fin.platformCut;
  }
  const investmentSpent = investmentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const allTimeProfit = allTimeSales - allTimeCost - investmentSpent;
  const paidBackPct = investmentSpent > 0 ? Math.max(0, Math.min(100, (allTimeProfit / investmentSpent) * 100)) : null;
  return { investmentSpent, allTimeProfit, paidBackPct };
}

function aggregateStockMovements(movements: { type: string; quantity: number; unitCost: number | null }[]) {
  const stock = { purchased: 0, usedInSales: 0, wastage: 0 };
  for (const m of movements) {
    const value = Math.abs(m.quantity) * (m.unitCost ?? 0);
    if (m.type === "PURCHASE") stock.purchased += value;
    else if (m.type === "SALE") stock.usedInSales += value;
    else stock.wastage += value;
  }
  return stock;
}

/** Everything the Overview "Analytics" picture needs for a period: sales, cost, profit, best sellers, daily series. */
export async function computeAnalytics(from: Date, to: Date) {
  const [allOrders, expenses, allTimeOrders, investmentExpenses] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
    }),
    // Not scoped to the period — "paid back" tracks cumulative progress since day one.
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { category: { in: ["STARTUP_INVESTMENT", "PACKAGING"] } },
    }),
  ]);

  const orders = allOrders.filter((o) => o.status !== "CANCELLED");
  const successfulCount = orders.length;
  const cancelledCount = allOrders.length - orders.length;

  const dailyMap = new Map<string, DailyBucket>();
  for (const day of eachDay({ from, to })) {
    dailyMap.set(day, { sales: 0, cost: 0 });
  }

  const orderAgg = aggregateOrders(orders, dailyMap);
  const itemTotals = aggregateItemTotals(orders);

  const menuItemIds = Array.from(itemTotals.keys());
  const menuItemNames = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(menuItemNames.map((m) => [m.id, m.name]));

  const profitByItem = buildProfitByItem(itemTotals, nameById);
  const bestSellers = [...profitByItem].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  const { expenseTotal, expensesByCategory, labourCost, otherExpenses } = aggregateExpenses(expenses, dailyMap);

  const totalOperatingCost = orderAgg.cogs + orderAgg.foodpandaCut + expenseTotal;
  const cost = totalOperatingCost;
  const profit = orderAgg.sales - cost;

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    sales: v.sales,
    cost: v.cost,
    profit: v.sales - v.cost,
  }));

  const { investmentSpent, allTimeProfit, paidBackPct } = computeAllTimeProgress(allTimeOrders, investmentExpenses);

  const movements = await prisma.stockMovement.findMany({
    where: { date: { gte: from, lte: to }, type: { in: ["PURCHASE", "SALE", "WASTAGE"] } },
    select: { type: true, quantity: true, unitCost: true },
  });
  const stock = aggregateStockMovements(movements);

  return {
    cutParts: orderAgg.cutParts,
    stock,
    from: from.toISOString(),
    to: to.toISOString(),
    sales: orderAgg.sales,
    foodpandaSales: orderAgg.foodpandaSales,
    privateSales: orderAgg.privateSales,
    successfulCount,
    cancelledCount,
    averageOrderValue: successfulCount > 0 ? orderAgg.sales / successfulCount : 0,
    cogs: orderAgg.cogs,
    ingredientCost: orderAgg.ingredientCost,
    packagingCost: orderAgg.packagingCost,
    foodpandaCut: orderAgg.foodpandaCut,
    taxWithheld: orderAgg.taxWithheld,
    foodpandaCharges: orderAgg.foodpandaCharges,
    expenses: expenseTotal,
    expensesByCategory,
    labourCost,
    otherExpenses,
    cost,
    totalOperatingCost,
    profit,
    orderCount: successfulCount,
    daily,
    profitByItem,
    bestSellers,
    investment: {
      spent: investmentSpent,
      allTimeProfit,
      paidBackPct,
    },
  };
}
