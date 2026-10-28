import { NextRequest, NextResponse } from "next/server";
import { MenuItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncOrdersStock } from "@/lib/stock-ledger";

interface OrderRow {
  externalId: string;
  status: string;
  receivedAt: string;
  subtotal: number;
  payoutAmount?: number;
  itemsText: string;
}

interface InvoiceRow {
  invoiceNumber: string;
  invoiceDate: string;
  orderCode: string;
  wastage: boolean;
  deliveryMode: string | null;
  orderAmount: number;
  foodGst: number;
  salesTaxCollection: number;
  incomeTaxWithholding: number;
  salesTaxWithholding: number;
  alreadyReceivedAmount: number;
  discountFundedByPlatform: number;
  voucherFundedByPlatform: number;
  discountPaidByRestaurant: number;
  voucherPaidByRestaurant: number;
  restaurantRevenue: number;
  commissionBase: number;
  commissionRate: number;
  commission: number;
  waitingTimeFee: number;
  sstOnCommission: number;
  onlinePaymentFee: number;
  payableAmount: number;
  wastageRefundAmount: number;
  packagingFeesPaidByCustomer: number;
}

interface ExistingOrder {
  id: string;
  invoiceId: string | null;
}

interface OrderItemData {
  menuItemId: string;
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
  packagingCostAtSale: number;
}

interface RowResult {
  touchedOrderId: string | null;
  created: boolean;
  updated: boolean;
  estimated: boolean;
  alreadyInvoiced: boolean;
  noInvoice: boolean;
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

function invoiceOrderFields(invoiceRow: InvoiceRow, status: string, invoiceId: string | undefined) {
  return {
      channel: "FOODPANDA" as const,
      status: status as never,
      totalAmount: invoiceRow.orderAmount,
      platformCutOverride: Math.round((invoiceRow.orderAmount - invoiceRow.payableAmount) * 100) / 100,
      invoiceId,
      wastage: invoiceRow.wastage,
      deliveryMode: invoiceRow.deliveryMode,
      foodGst: invoiceRow.foodGst,
      salesTaxCollection: invoiceRow.salesTaxCollection,
      incomeTaxWithholding: invoiceRow.incomeTaxWithholding,
      salesTaxWithholding: invoiceRow.salesTaxWithholding,
      alreadyReceivedAmount: invoiceRow.alreadyReceivedAmount,
      discountFundedByPlatform: invoiceRow.discountFundedByPlatform,
      voucherFundedByPlatform: invoiceRow.voucherFundedByPlatform,
      discountPaidByRestaurant: invoiceRow.discountPaidByRestaurant,
      voucherPaidByRestaurant: invoiceRow.voucherPaidByRestaurant,
      restaurantRevenue: invoiceRow.restaurantRevenue,
      commissionBase: invoiceRow.commissionBase,
      commissionRate: invoiceRow.commissionRate,
      commission: invoiceRow.commission,
      waitingTimeFee: invoiceRow.waitingTimeFee,
      sstOnCommission: invoiceRow.sstOnCommission,
      onlinePaymentFee: invoiceRow.onlinePaymentFee,
      payableAmount: invoiceRow.payableAmount,
      wastageRefundAmount: invoiceRow.wastageRefundAmount,
      packagingFeesPaidByCustomer: invoiceRow.packagingFeesPaidByCustomer,
      notes: `Foodpanda invoice ${invoiceRow.invoiceNumber}: commission Rs${invoiceRow.commission.toFixed(2)} (${invoiceRow.commissionRate}%), GST Rs${invoiceRow.foodGst.toFixed(2)}, income tax w/h Rs${invoiceRow.incomeTaxWithholding.toFixed(2)}, sales tax w/h Rs${invoiceRow.salesTaxWithholding.toFixed(2)}, SST on commission Rs${invoiceRow.sstOnCommission.toFixed(2)}.`,
  };
}

/** Upserts one Invoice per unique invoice number seen in this file; returns invoice id by number. */
async function upsertInvoices(invoiceRows: InvoiceRow[]): Promise<Map<string, string>> {
  const invoiceNumbers = Array.from(new Set(invoiceRows.map((i) => i.invoiceNumber)));
  const invoiceIdByNumber = new Map<string, string>();
  for (const invoiceNumber of invoiceNumbers) {
    const first = invoiceRows.find((i) => i.invoiceNumber === invoiceNumber)!;
    const invoiceDate = new Date(first.invoiceDate);
    const invoice = await prisma.invoice.upsert({
      where: { invoiceNumber },
      update: {},
      create: {
        invoiceNumber,
        invoiceDate: isNaN(invoiceDate.getTime()) ? new Date() : invoiceDate,
        foodpandaPayout: 0,
      },
    });
    invoiceIdByNumber.set(invoiceNumber, invoice.id);
  }
  return invoiceIdByNumber;
}

function matchOrderItems(itemsText: string, menuItemByName: Map<string, MenuItem>, unmatchedDishes: Set<string>): OrderItemData[] {
  const itemsData: OrderItemData[] = [];
  for (const item of parseOrderItems(itemsText)) {
    const menuItem = menuItemByName.get(item.matchName.toLowerCase());
    if (!menuItem) {
      unmatchedDishes.add(item.rawName);
      continue;
    }
    itemsData.push({
      menuItemId: menuItem.id,
      quantity: item.quantity,
      priceAtSale: menuItem.price,
      costAtSale: menuItem.costPrice,
      packagingCostAtSale: menuItem.packagingCostPrice,
    });
  }
  return itemsData;
}

function buildOrderFields(row: OrderRow, invoiceRow: InvoiceRow | undefined, status: string, invoiceIdByNumber: Map<string, string>) {
  if (invoiceRow) return invoiceOrderFields(invoiceRow, status, invoiceIdByNumber.get(invoiceRow.invoiceNumber));
  // Without an invoice yet, the order-details payout is Foodpanda's own estimate of what you'll receive.
  const estimatedCut =
    status === "CANCELLED" || row.payoutAmount == null ? null : Math.round((row.subtotal - row.payoutAmount) * 100) / 100;
  return {
    channel: "FOODPANDA" as const,
    status: status as never,
    totalAmount: row.subtotal,
    platformCutOverride: estimatedCut,
    deliveryMode: null,
  };
}

async function upsertOrder(
  existingId: string | undefined,
  row: OrderRow,
  customerId: string,
  createdAt: Date,
  orderFields: ReturnType<typeof buildOrderFields>,
  itemsData: OrderItemData[]
): Promise<{ id: string; created: boolean }> {
  if (existingId) {
    await prisma.orderItem.deleteMany({ where: { orderId: existingId } });
    await prisma.order.update({
      where: { id: existingId },
      data: { ...orderFields, items: { create: itemsData } },
    });
    return { id: existingId, created: false };
  }
  const createdOrder = await prisma.order.create({
    data: {
      customerId,
      deliveryAddress: "",
      createdAt,
      updatedAt: createdAt,
      externalId: row.externalId,
      ...orderFields,
      items: { create: itemsData },
    },
  });
  return { id: createdOrder.id, created: true };
}

async function processOrderRow(
  row: OrderRow,
  invoiceRow: InvoiceRow | undefined,
  existing: ExistingOrder | undefined,
  customerId: string,
  menuItemByName: Map<string, MenuItem>,
  invoiceIdByNumber: Map<string, string>,
  unmatchedDishes: Set<string>
): Promise<RowResult> {
  const skip: RowResult = { touchedOrderId: null, created: false, updated: false, estimated: false, alreadyInvoiced: false, noInvoice: false };

  // A nightly re-upload must never overwrite exact invoice figures with estimates.
  if (!invoiceRow && existing?.invoiceId) return { ...skip, alreadyInvoiced: true };

  const status = row.status.toUpperCase() === "CANCELLED" ? "CANCELLED" : "DELIVERED";
  const createdAt = new Date(row.receivedAt.replace(" ", "T"));
  if (isNaN(createdAt.getTime())) return skip;

  const itemsData = matchOrderItems(row.itemsText, menuItemByName, unmatchedDishes);
  const orderFields = buildOrderFields(row, invoiceRow, status, invoiceIdByNumber);
  const { id, created } = await upsertOrder(existing?.id, row, customerId, createdAt, orderFields, itemsData);

  return { touchedOrderId: id, created, updated: !created, estimated: !invoiceRow, alreadyInvoiced: false, noInvoice: !invoiceRow };
}

/** Recomputes each touched invoice's total payout from its now-linked orders. */
async function recomputeInvoicePayouts(invoiceIdByNumber: Map<string, string>) {
  for (const invoiceId of invoiceIdByNumber.values()) {
    const linked = await prisma.order.findMany({ where: { invoiceId }, select: { payableAmount: true } });
    const foodpandaPayout = linked.reduce((sum, o) => sum + (o.payableAmount ?? 0), 0);
    await prisma.invoice.update({ where: { id: invoiceId }, data: { foodpandaPayout } });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const orders: OrderRow[] = body.orders ?? [];
  const invoiceRows: InvoiceRow[] = body.invoices ?? [];

  if (orders.length === 0) {
    return NextResponse.json({ error: "No order rows provided" }, { status: 400 });
  }
  const invoiceByCode = new Map(invoiceRows.map((i) => [i.orderCode, i]));

  const menuItems = await prisma.menuItem.findMany();
  const menuItemByName = new Map(menuItems.map((m) => [m.name.trim().toLowerCase(), m]));

  const existingOrders = await prisma.order.findMany({
    where: { externalId: { in: orders.map((o) => o.externalId) } },
    select: { id: true, externalId: true, invoiceId: true },
  });
  const existingByExternalId = new Map(existingOrders.map((o) => [o.externalId, o]));

  const customer = await prisma.customer.upsert({
    where: { phone: SUMMARY_CUSTOMER_PHONE },
    update: {},
    create: { name: "Foodpanda (imported)", phone: SUMMARY_CUSTOMER_PHONE, address: null },
  });

  const invoiceIdByNumber = await upsertInvoices(invoiceRows);

  const touchedOrderIds: string[] = [];
  let created = 0;
  let updated = 0;
  let estimated = 0;
  let alreadyInvoiced = 0;
  const noInvoice: string[] = [];
  const unmatchedDishes = new Set<string>();

  for (const row of orders) {
    const result = await processOrderRow(
      row,
      invoiceByCode.get(row.externalId),
      existingByExternalId.get(row.externalId),
      customer.id,
      menuItemByName,
      invoiceIdByNumber,
      unmatchedDishes
    );
    if (result.touchedOrderId) touchedOrderIds.push(result.touchedOrderId);
    if (result.created) created++;
    if (result.updated) updated++;
    if (result.estimated) estimated++;
    if (result.alreadyInvoiced) alreadyInvoiced++;
    if (result.noInvoice) noInvoice.push(row.externalId);
  }

  await syncOrdersStock(prisma, touchedOrderIds);
  await recomputeInvoicePayouts(invoiceIdByNumber);

  return NextResponse.json({
    created,
    updated,
    estimated,
    alreadyInvoiced,
    noInvoiceCount: noInvoice.length,
    noInvoice,
    unmatchedDishes: Array.from(unmatchedDishes),
    invoicesProcessed: Array.from(invoiceIdByNumber.keys()),
  });
}
