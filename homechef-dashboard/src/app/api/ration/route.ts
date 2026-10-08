import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const date: { gte?: Date; lte?: Date } = {};
  if (from) date.gte = new Date(from);
  if (to) date.lte = new Date(to);

  const items = await prisma.rationItem.findMany({
    where: from || to ? { date } : undefined,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { name, amount, date } = await req.json();
  if (!name || !(Number(amount) > 0)) {
    return NextResponse.json({ error: "name and an amount above 0 are required" }, { status: 400 });
  }
  const when = date ? new Date(date) : new Date();
  if (isNaN(when.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const item = await prisma.rationItem.create({ data: { name, amount: Number(amount), date: when } });
  return NextResponse.json(item, { status: 201 });
}
