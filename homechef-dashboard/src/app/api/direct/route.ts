import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderFinancials } from "@/lib/finance";

/** Direct orders only: sales, expenses as the cost, best sellers and the latest orders for a period. */
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? new Date(0).toISOString();
  const to = req.nextUrl.searchParams.get("to") ?? new Date().toISOString();
  const range = { gte: new Date(from), lte: new Date(to) };

  const [orders, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { channel: "DIRECT", createdAt: range },
      include: { customer: true, items: { include: { menuItem: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({ where: { date: range } }),
  ]);

  const sold = orders.filter((o) => o.status !== "CANCELLED");
  const sales = sold.reduce((sum, o) => sum + orderFinancials(o).revenue, 0);
  const cost = expenses.reduce((sum, e) => sum + e.amount, 0);

  const totals = new Map<string, { name: string; quantity: number; sales: number }>();
  for (const order of sold) {
    for (const item of order.items) {
      const row = totals.get(item.menuItemId) ?? { name: item.menuItem.name, quantity: 0, sales: 0 };
      row.quantity += item.quantity;
      row.sales += item.priceAtSale * item.quantity;
      totals.set(item.menuItemId, row);
    }
  }
  const bestSellers = [...totals.entries()]
    .map(([menuItemId, row]) => ({ menuItemId, ...row }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return NextResponse.json({
    sales,
    cost,
    orderCount: sold.length,
    bestSellers,
    orders: orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      status: o.status,
      customerName: o.customer.name,
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      total: o.totalAmount,
    })),
  });
}
