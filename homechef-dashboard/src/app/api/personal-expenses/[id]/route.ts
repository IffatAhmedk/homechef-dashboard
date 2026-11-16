import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERSONAL_EXPENSE_CATEGORIES } from "@/lib/format";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.personalExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { category } = (await req.json()) as { category?: string };

  if (!category || !(PERSONAL_EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "A valid category is required" }, { status: 400 });
  }

  const expense = await prisma.personalExpense.update({ where: { id }, data: { category: category as never } });
  return NextResponse.json(expense);
}
