import * as XLSX from "xlsx";
import Papa from "papaparse";

/** "1,234.50" or 1234.5 → 1234.5 */
export function parseMoney(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/,/g, "")) || 0;
}

export interface OrderDetailRow {
  externalId: string;
  status: string;
  receivedAt: string;
  subtotal: number;
  payoutAmount: number;
  itemsText: string;
}

export interface InvoiceRow {
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

type Cell = string | number | boolean | Date;

/**
 * Reads Foodpanda's order-details export (.csv or .xlsx). The .xlsx groups columns under section
 * labels (Income, Deductions…) on its first row, with the real names ("Order ID", …) one row below,
 * so this skips down to the row that holds "Order ID".
 */
export async function readOrderDetails(file: File): Promise<OrderDetailRow[]> {
  let rows: Record<string, Cell>[];
  if (/\.xlsx?$/i.test(file.name)) {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = book.Sheets[book.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });
    const headerRow = Math.max(0, raw.findIndex((row) => row.includes("Order ID")));
    rows = XLSX.utils.sheet_to_json<Record<string, Cell>>(sheet, { range: headerRow });
  } else {
    rows = await new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: (parsed) => resolve(parsed.data) });
    });
  }

  return rows.map((r) => ({
    externalId: String(r["Order ID"]),
    status: String(r["Order status"]),
    receivedAt: r["Order received at"] instanceof Date ? r["Order received at"].toISOString() : String(r["Order received at"]),
    subtotal: parseMoney(r["Subtotal"] as string | number | undefined),
    payoutAmount: parseMoney(r["Payout Amount"] as string | number | undefined),
    itemsText: String(r["Order Items"] ?? ""),
  }));
}

/** Reads Foodpanda's weekly invoice workbooks (.xlsx), one row per order. */
export async function readInvoices(files: File[]): Promise<InvoiceRow[]> {
  const all: InvoiceRow[] = [];
  for (const file of files) {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, Cell>>(book.Sheets[book.SheetNames[0]]);
    const number = (r: Record<string, Cell>, column: string) => Number(r[column]) || 0;
    for (const r of rows) {
      all.push({
        invoiceNumber: String(r["Invoice Number"]),
        invoiceDate: r["Invoice Date"] instanceof Date ? r["Invoice Date"].toISOString() : String(r["Invoice Date"]),
        orderCode: String(r["Order Code"]),
        wastage: String(r["Wastage"]).trim().toUpperCase() === "Y",
        deliveryMode: r["Delivery Mode"] != null ? String(r["Delivery Mode"]) : null,
        orderAmount: number(r, "Order Amount"),
        foodGst: number(r, "Food GST"),
        salesTaxCollection: number(r, "Sales Tax Collection"),
        incomeTaxWithholding: number(r, "Income Tax Withholding"),
        salesTaxWithholding: number(r, "Sales Tax Withholding"),
        alreadyReceivedAmount: number(r, "Already Received Amount"),
        discountFundedByPlatform: number(r, "Discount funded by Platform"),
        voucherFundedByPlatform: number(r, "Voucher funded by Platform"),
        discountPaidByRestaurant: number(r, "Discount Paid By Restaurant"),
        voucherPaidByRestaurant: number(r, "Voucher Paid By Restaurant"),
        restaurantRevenue: number(r, "Restaurant Revenue"),
        commissionBase: number(r, "foodpanda Commission Base"),
        commissionRate: number(r, "foodpanda Commission Rate"),
        commission: number(r, "foodpanda Commission"),
        waitingTimeFee: number(r, "Waiting Time Fee"),
        sstOnCommission: number(r, "SST on foodpanda commission"),
        onlinePaymentFee: number(r, "Online Payment"),
        payableAmount: number(r, "Payable Amount"),
        wastageRefundAmount: number(r, "Wastage Refund Amount"),
        packagingFeesPaidByCustomer: number(r, "Packaging Fees Paid By Customer"),
      });
    }
  }
  return all;
}
