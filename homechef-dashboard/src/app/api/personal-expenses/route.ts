import { NextRequest, NextResponse } from "next/server";
import { dateFilterFromParams } from "@/lib/date-range";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const date = dateFilterFromParams(req.nextUrl.searchParams);
  const expenses = await prisma.personalExpense.findMany({
    where: date ? { date } : undefined,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const { category, description, amount, date } = await req.json();
  if (!category || !description || !(Number(amount) > 0)) {
    return NextResponse.json({ error: "category, description and an amount above 0 are required" }, { status: 400 });
  }
  const when = date ? new Date(date) : new Date();
  if (isNaN(when.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const expense = await prisma.personalExpense.create({
    data: { category, description, amount: Number(amount), date: when },
  });
  return NextResponse.json(expense, { status: 201 });
}
