"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/FilePicker";
import { ImportActions } from "@/components/ImportActions";
import { importOrders } from "@/data/orders";
import { downloadCsv } from "@/lib/files";

const HEADERS = ["order_ref", "date", "channel", "customer_name", "customer_phone", "address", "item_name", "quantity", "price", "status", "notes"];
const EXAMPLES = [
  ["FP-1001", "2026-09-10", "FOODPANDA", "", "", "", "Chicken Biryani", 2, 220, "DELIVERED", ""],
  ["DIRECT-1", "2026-09-11", "DIRECT", "Ayesha Raza", "03001234567", "House 12 Bahria Town", "Ghar Ka Thali (Veg)", 1, 199, "DELIVERED", ""],
];

interface CsvResult {
  imported: number;
  failedCount: number;
  results: { order_ref: string; status: "ok" | "error"; message?: string }[];
}

/** Orders you compiled by hand: one row per item, grouped by order_ref. */
export function ImportOrdersCsv({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<{ order_ref?: string }[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvResult | null>(null);

  function chooseFile([file]: File[]) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<{ order_ref?: string }>(file, { header: true, skipEmptyLines: true, complete: (parsed) => setRows(parsed.data) });
  }

  async function runImport() {
    setImporting(true);
    const response = await importOrders<CsvResult>("csv", { rows });
    setImporting(false);
    if (response.ok) setResult(response.data);
  }

  const orderCount = rows ? new Set(rows.map((r, i) => r.order_ref || `row-${i + 1}`)).size : 0;

  return (
    <>
      <p className="text-base text-ink-muted">For hand-compiled order data with full item detail — one row per line item, grouped by order_ref.</p>
      <Button variant="ghost" onClick={() => downloadCsv(HEADERS, EXAMPLES, "orders-import-template.csv")}>
        <Download size={16} /> Download CSV template
      </Button>
      <FilePicker fileName={fileName} prompt="Choose a CSV file" accept=".csv" onFiles={chooseFile} />

      {rows && !result && (
        <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">
          Found {rows.length} line(s) across {orderCount} order(s). Items are matched by name against your current menu — cost is pulled from each item&apos;s cost
          automatically.
        </p>
      )}

      {result && (
        <>
          <p className="rounded-lg bg-leaf-soft p-3 text-base text-leaf">Imported {result.imported} order(s).</p>
          {result.failedCount > 0 && (
            <div className="rounded-lg bg-danger-soft p-3 text-caption text-danger">
              <p className="mb-1 font-bold">{result.failedCount} order(s) failed:</p>
              {result.results
                .filter((r) => r.status === "error")
                .map((r) => (
                  <p key={r.order_ref}>
                    {r.order_ref}: {r.message}
                  </p>
                ))}
            </div>
          )}
        </>
      )}

      <ImportActions done={!!result} canImport={!!rows?.length} importing={importing} onImport={runImport} onClose={onClose} />
    </>
  );
}
