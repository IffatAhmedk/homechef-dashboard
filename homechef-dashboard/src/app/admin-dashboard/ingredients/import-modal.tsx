"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { mutate } from "swr";
import { X, Upload, Download } from "lucide-react";

const TEMPLATE = `name,unit,cost_per_unit
Flour,kg,180
Egg,piece,25
Cooking Oil,ml,0.6
`;

interface RawRow {
  name: string;
  unit: string;
  cost_per_unit: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: string; message: string }[];
}

export default function IngredientsImportModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
    });
  }

  async function handleImport() {
    if (!rows) return;
    setImporting(true);
    const res = await fetch("/api/ingredients/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
    if (data.created > 0 || data.updated > 0) {
      await mutate("/api/ingredients");
      await mutate("/api/menu");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ingredients-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Import ingredients</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-sm text-charcoal/60">
            Existing ingredients (matched by name) get their cost updated; new names are added. Any menu items using
            an updated ingredient will have their cost recalculated automatically.
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
            <div className="rounded-lg bg-warm-beige/20 p-3 text-sm text-charcoal/70">
              Found {rows.length} row(s).
            </div>
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
      </div>
    </div>
  );
}
