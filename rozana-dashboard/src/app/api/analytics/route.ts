import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [orders, customers, menuItems] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { items: { include: { menuItem: true } } },
    }),
    prisma.customer.count(),
    prisma.menuItem.findMany(),
  ]);

  const revenueToday = orders
    .filter((o) => o.createdAt >= startOfToday)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const ordersToday = orders.filter((o) => o.createdAt >= startOfToday).length;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    if (o.createdAt >= sevenDaysAgo) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + o.totalAmount);
    }
  }
  const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const oi of o.items) {
      const existing = itemCounts.get(oi.menuItemId) ?? { name: oi.menuItem.name, qty: 0, revenue: 0 };
      existing.qty += oi.quantity;
      existing.revenue += oi.quantity * oi.priceAtSale;
      itemCounts.set(oi.menuItemId, existing);
    }
  }
  const topItems = Array.from(itemCounts.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const statusCounts = new Map<string, number>();
  for (const o of orders) {
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  }

  const lowStockItems = menuItems.filter((m) => m.stockQty <= 10).sort((a, b) => a.stockQty - b.stockQty);

  return NextResponse.json({
    revenueToday,
    ordersToday,
    totalRevenue,
    totalOrders: orders.length,
    totalCustomers: customers,
    dailyRevenue,
    topItems,
    statusCounts: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    lowStockItems: lowStockItems.map((m) => ({ id: m.id, name: m.name, stockQty: m.stockQty })),
  });
}
