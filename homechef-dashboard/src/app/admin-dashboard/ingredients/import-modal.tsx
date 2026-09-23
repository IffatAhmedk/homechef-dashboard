"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { mutate } from "swr";
import { X, Upload, Download } from "lucide-react";

const TEMPLATE = `name,unit,cost_per_unit,category
Flour,kg,180,food
Egg,piece,25,food
Cooking Oil,ml,0.6,food
Takeaway Box - Medium,piece,15,packaging
`;

interface RawRow {
  name: string;
  unit: string;
  cost_per_unit: string;
  category?: string;
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
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Import ingredients</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-sm text-ink-muted">
            Existing ingredients (matched by name) get their cost updated; new names are added. Any menu items using
            an updated ingredient will have their cost recalculated automatically.
          </p>
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-brand hover:underline">
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-control py-6 text-sm text-ink-muted hover:border-brand hover:text-brand"
            >
              <Upload size={16} />
              {fileName || "Choose a CSV file"}
            </button>
          </div>

          {rows && !result && (
            <div className="rounded-lg bg-sunken p-3 text-sm text-ink-muted">
              Found {rows.length} row(s).
            </div>
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
      </div>
    </div>
  );
}
