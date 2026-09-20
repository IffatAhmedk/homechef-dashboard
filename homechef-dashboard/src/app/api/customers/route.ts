import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: {
      orders: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withStats = customers.map((c) => {
    const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return {
      ...c,
      orderCount: c.orders.length,
      totalSpent,
      lastOrderAt: c.orders[0]?.createdAt ?? null,
    };
  });

  return NextResponse.json(withStats);
}
