import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderFinancials, itemFinancials } from "@/lib/finance";
import { eachDay } from "@/lib/date-range";

export async function GET(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth(), 1);

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

  let sales = 0;
  let foodpandaSales = 0;
  let privateSales = 0;
  let cogs = 0;
  let ingredientCost = 0;
  let packagingCost = 0;
  let foodpandaCut = 0;
  let taxWithheld = 0;
  let foodpandaCharges = 0;

  const dailyMap = new Map<string, { sales: number; cost: number }>();
  for (const day of eachDay({ from, to })) {
    dailyMap.set(day, { sales: 0, cost: 0 });
  }

  const itemTotals = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>();

  for (const order of orders) {
    const fin = orderFinancials(order);
    sales += fin.revenue;
    cogs += fin.cost;
    ingredientCost += fin.ingredientCost;
    packagingCost += fin.packagingCost;
    foodpandaCut += fin.platformCut;

    if (order.channel === "FOODPANDA") {
      foodpandaSales += fin.revenue;
      taxWithheld += (order.salesTaxCollection ?? 0) + (order.incomeTaxWithholding ?? 0) + (order.salesTaxWithholding ?? 0);
      foodpandaCharges += (order.commission ?? 0) + (order.sstOnCommission ?? 0) + (order.onlinePaymentFee ?? 0) + (order.waitingTimeFee ?? 0);
    } else {
      privateSales += fin.revenue;
    }

    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.sales += fin.revenue;
      bucket.cost += fin.cost + fin.platformCut;
    }
  }

  for (const order of orders) {
    for (const oi of order.items as { menuItemId: string; quantity: number; priceAtSale: number; costAtSale: number; packagingCostAtSale: number }[]) {
      const itemFin = itemFinancials(oi, order.channel);
      const key = oi.menuItemId;
      const existing = itemTotals.get(key) ?? { name: "", quantity: 0, revenue: 0, cost: 0 };
      existing.quantity += oi.quantity;
      existing.revenue += itemFin.revenue;
      existing.cost += itemFin.cost + itemFin.platformCut;
      itemTotals.set(key, existing);
    }
  }

  const menuItemIds = Array.from(itemTotals.keys());
  const menuItemNames = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(menuItemNames.map((m) => [m.id, m.name]));

  const profitByItem = Array.from(itemTotals.entries())
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

  const bestSellers = [...profitByItem].sort((a, b) => b.quantity - a.quantity).slice(0, 5);

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

  const totalOperatingCost = cogs + foodpandaCut + expenseTotal;
  const cost = totalOperatingCost;
  const profit = sales - cost;

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    sales: v.sales,
    cost: v.cost,
    profit: v.sales - v.cost,
  }));

  // All-time "paid back" progress against startup + packaging investment.
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

  const movements = await prisma.stockMovement.findMany({
    where: { date: { gte: from, lte: to }, type: { in: ["PURCHASE", "SALE", "WASTAGE"] } },
    select: { type: true, quantity: true, unitCost: true },
  });
  const stock = { purchased: 0, usedInSales: 0, wastage: 0 };
  for (const m of movements) {
    const value = Math.abs(m.quantity) * (m.unitCost ?? 0);
    if (m.type === "PURCHASE") stock.purchased += value;
    else if (m.type === "SALE") stock.usedInSales += value;
    else stock.wastage += value;
  }

  return NextResponse.json({
    stock,
    from: from.toISOString(),
    to: to.toISOString(),
    sales,
    foodpandaSales,
    privateSales,
    successfulCount,
    cancelledCount,
    averageOrderValue: successfulCount > 0 ? sales / successfulCount : 0,
    cogs,
    ingredientCost,
    packagingCost,
    foodpandaCut,
    taxWithheld,
    foodpandaCharges,
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
  });
}
