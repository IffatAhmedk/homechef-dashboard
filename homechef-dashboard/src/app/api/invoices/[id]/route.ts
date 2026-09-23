import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      orders: {
        include: { customer: true, items: { include: { menuItem: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actualBankDeposit, paymentDate, pendingAmount, disputedAmount, notes } = await req.json();

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(actualBankDeposit !== undefined && { actualBankDeposit: actualBankDeposit === null ? null : Number(actualBankDeposit) }),
      ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
      ...(pendingAmount !== undefined && { pendingAmount: pendingAmount === null ? null : Number(pendingAmount) }),
      ...(disputedAmount !== undefined && { disputedAmount: disputedAmount === null ? null : Number(disputedAmount) }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(invoice);
}
