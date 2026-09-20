import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderFinancials } from "@/lib/finance";
import { eachDay } from "@/lib/date-range";

export async function GET(req: NextRequest) {
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth(), 1);

  const [orders, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: from, lte: to } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  let sales = 0;
  let cogs = 0;
  let foodpandaCut = 0;

  const dailyMap = new Map<string, { sales: number; cost: number }>();
  for (const day of eachDay({ from, to })) {
    dailyMap.set(day, { sales: 0, cost: 0 });
  }

  for (const order of orders) {
    const fin = orderFinancials(order);
    sales += fin.revenue;
    cogs += fin.cost;
    foodpandaCut += fin.platformCut;

    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.sales += fin.revenue;
      bucket.cost += fin.cost + fin.platformCut;
    }
  }

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  for (const expense of expenses) {
    const key = expense.date.toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (bucket) bucket.cost += expense.amount;
  }

  const cost = cogs + foodpandaCut + expenseTotal;
  const profit = sales - cost;

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    sales: v.sales,
    cost: v.cost,
    profit: v.sales - v.cost,
  }));

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    sales,
    cogs,
    foodpandaCut,
    expenses: expenseTotal,
    cost,
    profit,
    orderCount: orders.length,
    daily,
  });
}
