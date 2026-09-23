import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncOrderStock } from "@/lib/stock-ledger";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const VALID_CHANNELS = ["DIRECT", "FOODPANDA"];

interface ImportRow {
  order_ref?: string;
  date?: string;
  channel?: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  item_name: string;
  quantity: string | number;
  price?: string | number;
  status?: string;
  notes?: string;
}

interface GroupResult {
  order_ref: string;
  status: "ok" | "error";
  message?: string;
  orderId?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: ImportRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const menuItems = await prisma.menuItem.findMany();
  const byName = new Map(menuItems.map((m) => [m.name.trim().toLowerCase(), m]));

  const groups = new Map<string, ImportRow[]>();
  rows.forEach((row, i) => {
    const ref = (row.order_ref && row.order_ref.trim()) || `row-${i + 1}`;
    if (!groups.has(ref)) groups.set(ref, []);
    groups.get(ref)!.push(row);
  });

  const results: GroupResult[] = [];
  const importBatch = Date.now();

  for (const [ref, groupRows] of groups) {
    try {
      const first = groupRows[0];

      const channel = (first.channel || "DIRECT").toUpperCase();
      if (!VALID_CHANNELS.includes(channel)) {
        throw new Error(`Invalid channel "${first.channel}" (use DIRECT or FOODPANDA)`);
      }

      const status = (first.status || "DELIVERED").toUpperCase();
      if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid status "${first.status}"`);
      }

      const createdAt = first.date ? new Date(first.date) : new Date();
      if (isNaN(createdAt.getTime())) {
        throw new Error(`Invalid date "${first.date}"`);
      }

      const itemsData: {
        menuItemId: string;
        quantity: number;
        priceAtSale: number;
        costAtSale: number;
        packagingCostAtSale: number;
      }[] = [];
      let total = 0;

      for (const row of groupRows) {
        const menuItem = byName.get((row.item_name || "").trim().toLowerCase());
        if (!menuItem) throw new Error(`Menu item "${row.item_name}" not found`);

        const quantity = Number(row.quantity);
        if (!quantity || quantity <= 0) throw new Error(`Invalid quantity for "${row.item_name}"`);

        const priceAtSale = row.price != null && row.price !== "" ? Number(row.price) : menuItem.price;
        total += priceAtSale * quantity;

        itemsData.push({
          menuItemId: menuItem.id,
          quantity,
          priceAtSale,
          costAtSale: menuItem.costPrice,
          packagingCostAtSale: menuItem.packagingCostPrice,
        });
      }

      const name = first.customer_name?.trim() || "Foodpanda Customer";
      const phone = first.customer_phone?.trim() || `import-${importBatch}-${ref}`;
      const address = first.address?.trim() || "";

      const order = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { phone },
          update: { name, ...(address && { address }) },
          create: { name, phone, address: address || null },
        });

        return tx.order.create({
          data: {
            customerId: customer.id,
            channel: channel as "DIRECT" | "FOODPANDA",
            status: status as never,
            deliveryAddress: address,
            notes: first.notes || null,
            totalAmount: total,
            createdAt,
            updatedAt: createdAt,
            items: { create: itemsData },
          },
        });
      });

      await syncOrderStock(prisma, order.id);
      results.push({ order_ref: ref, status: "ok", orderId: order.id });
    } catch (err) {
      results.push({
        order_ref: ref,
        status: "error",
        message: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  const imported = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error");

  return NextResponse.json({ imported, failedCount: failed.length, results });
}
