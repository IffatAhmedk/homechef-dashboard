import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { invoiceDate: "desc" },
  });
  return NextResponse.json(invoices);
}
