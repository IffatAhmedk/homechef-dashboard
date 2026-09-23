import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ImportRow {
  category: string;
  name: string;
  description?: string;
  price: string | number;
  cost_price?: string | number;
  stock_qty?: string | number;
  available?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows ?? [];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: { row: string; message: string }[] = [];

  const categories = await prisma.category.findMany();
  const menuItems = await prisma.menuItem.findMany();

  for (const row of rows) {
    const categoryName = (row.category ?? "").trim();
    const name = (row.name ?? "").trim();
    const price = Number(row.price);

    if (!categoryName || !name || isNaN(price)) {
      errors.push({ row: name || "(blank)", message: "category, name and price are all required" });
      continue;
    }

    let category = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      category = await prisma.category.create({ data: { name: categoryName, sortOrder: categories.length } });
      categories.push(category);
    }

    const costPrice = row.cost_price != null && row.cost_price !== "" ? Number(row.cost_price) : 0;
    const stockQty = row.stock_qty != null && row.stock_qty !== "" ? Number(row.stock_qty) : 0;
    const isAvailable = row.available == null || row.available === "" ? true : /^(y|yes|true|1)$/i.test(String(row.available));
    const description = row.description?.trim() || null;

    const existing = menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          categoryId: category.id,
          description,
          price,
          isAvailable,
          ...(existing.isDeal ? {} : { stockQty }),
          ...(existing.costIsAuto ? {} : { costPrice }),
        },
      });
      updated++;
    } else {
      const newItem = await prisma.menuItem.create({
        data: { categoryId: category.id, name, description, price, costPrice, stockQty, isAvailable },
      });
      menuItems.push(newItem);
      created++;
    }
  }

  return NextResponse.json({ created, updated, errors });
}
