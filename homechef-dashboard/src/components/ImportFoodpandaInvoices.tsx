"use client";

import { useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { ImportActions } from "@/components/ImportActions";
import { importOrders } from "@/data/orders";
import { readInvoices, readOrderDetails, type InvoiceRow, type OrderDetailRow } from "@/lib/foodpanda";

interface InvoiceResult {
  created: number;
  updated: number;
  noInvoiceCount: number;
  alreadyInvoiced: number;
  unmatchedDishes: string[];
}

/**
 * The main Foodpanda import. The order-details file alone gives estimated earnings (nightly is fine);
 * add the weekly invoice later to replace the estimates with exact figures.
 */
export function ImportFoodpandaInvoices({ onClose }: { onClose: () => void }) {
  const [detailsFile, setDetailsFile] = useState("");
  const [orders, setOrders] = useState<OrderDetailRow[] | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseDetails([file]: File[]) {
    setDetailsFile(file.name);
    setResult(null);
    setError(null);
    setOrders(await readOrderDetails(file));
  }

  async function chooseInvoices(files: File[]) {
    setResult(null);
    setError(null);
    setInvoiceFiles((current) => [...current, ...files.map((f) => f.name)]);
    const rows = await readInvoices(files);
    setInvoices((current) => [...current, ...rows]);
  }

  async function runImport() {
    setImporting(true);
    setError(null);
    const response = await importOrders<InvoiceResult>("foodpanda-invoices", { orders, invoices });
    setImporting(false);
    if (response.ok) setResult(response.data);
    else setError(response.error ?? "Import failed");
  }

  return (
    <>
      <p className="text-base text-ink-muted">
        Upload your order-details file any time — nightly is fine. Each order&apos;s cost of Foodpanda is estimated from its Payout Amount (subtotal minus payout),
        which matched the real invoices to the paisa in testing. When the weekly invoice arrives, add it here too: those orders are refreshed with the exact
        commission and tax breakdown. Re-uploading is always safe — orders already tied to an invoice are never overwritten with estimates.
      </p>

      <div>
        <p className="mb-1 text-caption font-bold text-ink-muted">Order details file (required)</p>
        <FilePicker fileName={detailsFile} prompt="Choose orderDetails.csv or .xlsx" accept=".csv,.xlsx,.xls" onFiles={chooseDetails} />
      </div>

      <div>
        <p className="mb-1 text-caption font-bold text-ink-muted">Invoice files (optional — add once Foodpanda issues the weekly invoice)</p>
        <FilePicker
          fileName={invoiceFiles.length > 0 ? `${invoiceFiles.length} invoice file(s) selected` : ""}
          prompt="Choose invoice .xlsx file(s)"
          accept=".xlsx"
          multiple
          onFiles={chooseInvoices}
        />
        {invoiceFiles.length > 0 && <p className="mt-1 text-caption text-ink-muted">{invoiceFiles.join(", ")}</p>}
      </div>

      {orders && !result && (
        <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">
          {orders.length} order(s) loaded
          {invoices.length > 0
            ? `, ${invoices.length} invoice line(s) loaded. Orders not on an invoice yet will use estimated earnings.`
            : ". No invoice added — all orders will use estimated earnings from the Payout Amount column."}
        </p>
      )}

      {error && <p className="rounded-lg bg-danger-soft p-3 text-caption text-danger">{error}</p>}

      {result && (
        <>
          <p className="rounded-lg bg-leaf-soft p-3 text-base text-leaf">
            {result.created} new order(s) added, {result.updated} existing order(s) refreshed.
            {result.noInvoiceCount > 0 && ` ${result.noInvoiceCount} use estimated earnings (no invoice yet).`}
            {result.alreadyInvoiced > 0 && ` ${result.alreadyInvoiced} already have exact invoice figures and were left untouched.`}
          </p>
          {result.unmatchedDishes.length > 0 && (
            <p className="rounded-lg bg-sunken p-3 text-caption text-ink-muted">
              {result.unmatchedDishes.length} item(s) didn&apos;t match a menu item — add them in Menu & Inventory for full accuracy: {result.unmatchedDishes.join(", ")}
            </p>
          )}
        </>
      )}

      <ImportActions done={!!result} canImport={!!orders} importing={importing} onImport={runImport} onClose={onClose} />
    </>
  );
}
