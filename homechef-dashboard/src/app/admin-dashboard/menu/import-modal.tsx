"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { mutate } from "swr";
import { X, Upload, Download } from "lucide-react";

type Mode = "items" | "recipes";

const ITEMS_HEADERS = ["category", "name", "description", "price", "cost_price", "stock_qty", "available"];
const ITEMS_EXAMPLE_ROWS = [
  ["Rotis & Breads", "Plain Paratha", "Fresh whole wheat paratha", 120, 50, 50, "yes"],
  ["Sweets", "Doodh Patti", "Traditional milk tea", 150, 40, 50, "yes"],
];

const RECIPES_HEADERS = ["menu_item", "component_type", "component_name", "quantity"];
const RECIPES_EXAMPLE_ROWS = [
  ["Plain Paratha", "ingredient", "Flour", 150],
  ["Plain Paratha", "ingredient", "Cooking Oil", 20],
  ["Combo 1", "item", "Plain Paratha", 1],
  ["Combo 1", "item", "Doodh Patti", 1],
];

function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx(headers: string[], rows: (string | number)[][], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/** Parses a .csv or .xlsx file into an array of row objects keyed by header. */
async function parseFile(file: File): Promise<Record<string, string | number>[]> {
  const isExcel = /\.xlsx?$/i.test(file.name);
  if (isExcel) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
  }
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data),
    });
  });
}

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: string; message: string }[];
}

export default function MenuImportModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("items");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Import menu</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-5 pt-3">
          {(
            [
              { value: "items", label: "Menu items" },
              { value: "recipes", label: "Recipes" },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={`rounded-t-lg px-3 py-2 text-sm font-bold ${
                mode === t.value ? "border-b-2 border-brand text-brand" : "text-ink-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "items" ? <ItemsImport onClose={onClose} /> : <RecipesImport onClose={onClose} />}
      </div>
    </div>
  );
}

function ItemsImport({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string | number>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setRows(await parseFile(file));
  }

  async function handleImport() {
    if (!rows) return;
    setImporting(true);
    const res = await fetch("/api/menu/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
    if (data.created > 0 || data.updated > 0) {
      await mutate("/api/menu");
      await mutate("/api/categories");
    }
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-ink-muted">
          Existing items (matched by name) get updated; new ones are added, and new categories are created
          automatically. Cost price is skipped for items that already have a recipe — that stays recipe-driven.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button
            onClick={() => downloadXlsx(ITEMS_HEADERS, ITEMS_EXAMPLE_ROWS, "Menu items", "menu-items-template.xlsx")}
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Download size={14} /> Download Excel template
          </button>
          <button
            onClick={() => downloadCsv(ITEMS_HEADERS, ITEMS_EXAMPLE_ROWS, "menu-items-template.csv")}
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Download size={14} /> Download CSV template
          </button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-control py-6 text-sm text-ink-muted hover:border-brand hover:text-brand"
          >
            <Upload size={16} />
            {fileName || "Choose a CSV or Excel file"}
          </button>
        </div>

        {rows && !result && (
          <div className="rounded-lg bg-sunken p-3 text-sm text-ink-muted">Found {rows.length} row(s).</div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-lg bg-leaf-soft p-3 text-sm text-leaf">
              {result.created} created, {result.updated} updated.
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-danger-soft p-3 text-xs text-danger">
                {result.errors.map((e, i) => (
                  <p key={i}>
                    {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
        <button onClick={onClose} className="rounded-pill px-5 text-label text-ink-muted hover:bg-sunken">
          {result ? "Close" : "Cancel"}
        </button>
        {!result && (
          <button
            onClick={handleImport}
            disabled={!rows || rows.length === 0 || importing}
            className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        )}
      </div>
    </>
  );
}

function RecipesImport({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string | number>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setRows(await parseFile(file));
  }

  async function handleImport() {
    if (!rows) return;
    setImporting(true);
    const res = await fetch("/api/menu/recipes-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
    if (data.created > 0 || data.updated > 0) {
      await mutate("/api/menu");
    }
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-ink-muted">
          One row per ingredient or component. <code className="text-xs">component_type</code> is{" "}
          <code className="text-xs">ingredient</code> or <code className="text-xs">item</code> (for combos made of
          other menu items). Both the menu item and its components must already exist — import ingredients and menu
          items first.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <button
            onClick={() => downloadXlsx(RECIPES_HEADERS, RECIPES_EXAMPLE_ROWS, "Recipes", "recipes-template.xlsx")}
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Download size={14} /> Download Excel template
          </button>
          <button
            onClick={() => downloadCsv(RECIPES_HEADERS, RECIPES_EXAMPLE_ROWS, "recipes-template.csv")}
            className="flex items-center gap-1.5 text-sm text-brand hover:underline"
          >
            <Download size={14} /> Download CSV template
          </button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-control py-6 text-sm text-ink-muted hover:border-brand hover:text-brand"
          >
            <Upload size={16} />
            {fileName || "Choose a CSV or Excel file"}
          </button>
        </div>

        {rows && !result && (
          <div className="rounded-lg bg-sunken p-3 text-sm text-ink-muted">Found {rows.length} row(s).</div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-lg bg-leaf-soft p-3 text-sm text-leaf">
              {result.created} created, {result.updated} updated.
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-danger-soft p-3 text-xs text-danger">
                {result.errors.map((e, i) => (
                  <p key={i}>
                    {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
        <button onClick={onClose} className="rounded-pill px-5 text-label text-ink-muted hover:bg-sunken">
          {result ? "Close" : "Cancel"}
        </button>
        {!result && (
          <button
            onClick={handleImport}
            disabled={!rows || rows.length === 0 || importing}
            className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        )}
      </div>
    </>
  );
}
