"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { mutate } from "swr";
import { X, Upload, Download } from "lucide-react";

type Mode = "items" | "recipes";

const ITEMS_TEMPLATE = `category,name,description,price,cost_price,stock_qty,available
Rotis & Breads,Plain Paratha,Fresh whole wheat paratha,120,50,50,yes
Sweets,Doodh Patti,Traditional milk tea,150,40,50,yes
`;

const RECIPES_TEMPLATE = `menu_item,component_type,component_name,quantity
Plain Paratha,ingredient,Flour,150
Plain Paratha,ingredient,Cooking Oil,20
Combo 1,item,Plain Paratha,1
Combo 1,item,Doodh Patti,1
`;

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: string; message: string }[];
}

export default function MenuImportModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("items");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Import menu</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-warm-beige/30 px-5 pt-3">
          {(
            [
              { value: "items", label: "Menu items" },
              { value: "recipes", label: "Recipes" },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setMode(t.value)}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                mode === t.value ? "border-b-2 border-terracotta text-terracotta" : "text-charcoal/50"
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
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
    });
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

  function downloadTemplate() {
    const blob = new Blob([ITEMS_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-items-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-charcoal/60">
          Existing items (matched by name) get updated; new ones are added, and new categories are created
          automatically. Cost price is skipped for items that already have a recipe — that stays recipe-driven.
        </p>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-terracotta hover:underline">
          <Download size={14} /> Download CSV template
        </button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-warm-beige/60 py-6 text-sm text-charcoal/60 hover:border-terracotta hover:text-terracotta"
          >
            <Upload size={16} />
            {fileName || "Choose a CSV file"}
          </button>
        </div>

        {rows && !result && (
          <div className="rounded-lg bg-warm-beige/20 p-3 text-sm text-charcoal/70">Found {rows.length} row(s).</div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-lg bg-sage/10 p-3 text-sm text-sage">
              {result.created} created, {result.updated} updated.
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-maroon/10 p-3 text-xs text-maroon">
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

      <div className="flex items-center justify-end gap-2 border-t border-warm-beige/30 px-5 py-4">
        <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-charcoal/60 hover:bg-cream">
          {result ? "Close" : "Cancel"}
        </button>
        {!result && (
          <button
            onClick={handleImport}
            disabled={!rows || rows.length === 0 || importing}
            className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
    });
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

  function downloadTemplate() {
    const blob = new Blob([RECIPES_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipes-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-charcoal/60">
          One row per ingredient or component. <code className="text-xs">component_type</code> is{" "}
          <code className="text-xs">ingredient</code> or <code className="text-xs">item</code> (for combos made of
          other menu items). Both the menu item and its components must already exist — import ingredients and menu
          items first.
        </p>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-terracotta hover:underline">
          <Download size={14} /> Download CSV template
        </button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-warm-beige/60 py-6 text-sm text-charcoal/60 hover:border-terracotta hover:text-terracotta"
          >
            <Upload size={16} />
            {fileName || "Choose a CSV file"}
          </button>
        </div>

        {rows && !result && (
          <div className="rounded-lg bg-warm-beige/20 p-3 text-sm text-charcoal/70">Found {rows.length} row(s).</div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-lg bg-sage/10 p-3 text-sm text-sage">
              {result.created} created, {result.updated} updated.
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-maroon/10 p-3 text-xs text-maroon">
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

      <div className="flex items-center justify-end gap-2 border-t border-warm-beige/30 px-5 py-4">
        <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-charcoal/60 hover:bg-cream">
          {result ? "Close" : "Cancel"}
        </button>
        {!result && (
          <button
            onClick={handleImport}
            disabled={!rows || rows.length === 0 || importing}
            className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        )}
      </div>
    </>
  );
}
