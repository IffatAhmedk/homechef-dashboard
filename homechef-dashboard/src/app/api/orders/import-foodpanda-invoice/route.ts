import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface OrderRow {
  externalId: string;
  status: string;
  receivedAt: string;
  subtotal: number;
  itemsText: string;
}

interface InvoiceRow {
  orderCode: string;
  orderAmount: number;
  payableAmount: number;
  commission: number;
  commissionRate: number;
  foodGst: number;
  incomeTaxWithholding: number;
  salesTaxWithholding: number;
  sstOnCommission: number;
}

const SUMMARY_CUSTOMER_PHONE = "foodpanda-invoiced";

function parseOrderItems(text: string): { quantity: number; rawName: string; matchName: string }[] {
  if (!text) return [];
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^(\d+)\s+(.+)$/);
      if (!m) return null;
      const quantity = Number(m[1]);
      const rawName = m[2].trim();
      const matchName = rawName.replace(/\s*\[.*\]\s*$/, "").trim();
      return { quantity, rawName, matchName };
    })
    .filter((x): x is { quantity: number; rawName: string; matchName: string } => x !== null);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const orders: OrderRow[] = body.orders ?? [];
  const invoices: InvoiceRow[] = body.invoices ?? [];

  if (orders.length === 0) {
    return NextResponse.json({ error: "No order rows provided" }, { status: 400 });
  }
  if (invoices.length === 0) {
    return NextResponse.json({ error: "No invoice rows provided" }, { status: 400 });
  }

  const invoiceByCode = new Map(invoices.map((i) => [i.orderCode, i]));

  const existing = await prisma.order.findMany({
    where: { externalId: { in: orders.map((o) => o.externalId) } },
    select: { externalId: true },
  });
  const alreadyImported = new Set(existing.map((o) => o.externalId));

  const menuItems = await prisma.menuItem.findMany();
  const byName = new Map(menuItems.map((m) => [m.name.trim().toLowerCase(), m]));

  const customer = await prisma.customer.upsert({
    where: { phone: SUMMARY_CUSTOMER_PHONE },
    update: {},
    create: { name: "Foodpanda (imported)", phone: SUMMARY_CUSTOMER_PHONE, address: null },
  });

  let imported = 0;
  let skippedDuplicate = 0;
  const noInvoice: string[] = [];
  const unmatchedDishes = new Set<string>();

  for (const row of orders) {
    if (alreadyImported.has(row.externalId)) {
      skippedDuplicate++;
      continue;
    }
    const invoice = invoiceByCode.get(row.externalId);
    if (!invoice) {
      noInvoice.push(row.externalId);
      continue;
    }

    const status = row.status.toUpperCase() === "CANCELLED" ? "CANCELLED" : "DELIVERED";
    const createdAt = new Date(row.receivedAt.replace(" ", "T"));
    if (isNaN(createdAt.getTime())) continue;

    const parsedItems = parseOrderItems(row.itemsText);
    const itemsData: { menuItemId: string; quantity: number; priceAtSale: number; costAtSale: number }[] = [];
    for (const item of parsedItems) {
      const menuItem = byName.get(item.matchName.toLowerCase());
      if (!menuItem) {
        unmatchedDishes.add(item.rawName);
        continue;
      }
      itemsData.push({
        menuItemId: menuItem.id,
        quantity: item.quantity,
        priceAtSale: menuItem.price,
        costAtSale: menuItem.costPrice,
      });
    }

    const platformCutOverride = Math.round((invoice.orderAmount - invoice.payableAmount) * 100) / 100;
    const notes = `Foodpanda invoice: commission Rs${invoice.commission.toFixed(2)} (${invoice.commissionRate}%), GST Rs${invoice.foodGst.toFixed(2)}, income tax w/h Rs${invoice.incomeTaxWithholding.toFixed(2)}, sales tax w/h Rs${invoice.salesTaxWithholding.toFixed(2)}, SST on commission Rs${invoice.sstOnCommission.toFixed(2)}.`;

    await prisma.order.create({
      data: {
        customerId: customer.id,
        channel: "FOODPANDA",
        status,
        deliveryAddress: "",
        notes,
        totalAmount: invoice.orderAmount,
        platformCutOverride,
        externalId: row.externalId,
        createdAt,
        updatedAt: createdAt,
        items: { create: itemsData },
      },
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    skippedDuplicate,
    noInvoiceCount: noInvoice.length,
    noInvoice,
    unmatchedDishes: Array.from(unmatchedDishes),
  });
}
