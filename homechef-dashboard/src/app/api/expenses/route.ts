import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const date: { gte?: Date; lte?: Date } = {};
  if (from) date.gte = new Date(from);
  if (to) date.lte = new Date(to);

  const expenses = await prisma.expense.findMany({
    where: from || to ? { date } : undefined,
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
      category: category || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
