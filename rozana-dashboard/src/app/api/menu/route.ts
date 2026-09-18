import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, price, categoryId, stockQty, isAvailable, imageUrl } = body;

  if (!name || !price || !categoryId) {
    return NextResponse.json({ error: "name, price and categoryId are required" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description ?? null,
      price: Number(price),
      categoryId,
      stockQty: stockQty != null ? Number(stockQty) : 0,
      isAvailable: isAvailable ?? true,
      imageUrl: imageUrl ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
