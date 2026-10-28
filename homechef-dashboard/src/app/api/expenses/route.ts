import { NextRequest, NextResponse } from "next/server";
import { dateFilterFromParams } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const date = dateFilterFromParams(req.nextUrl.searchParams);
  const expenses = await prisma.expense.findMany({
    where: date ? { date } : undefined,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, amount, category, date } = body;

  if (!description || amount == null) {
    return NextResponse.json({ error: "description and amount are required" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      description,
      amount: Number(amount),
      ...(category && { category }),
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
