"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/FilePicker";
import { ImportSummaryBox } from "@/components/ImportSummaryBox";
import { Modal } from "@/components/Modal";
import { importIngredients, type ImportSummary } from "@/data/ingredients";
import { downloadCsv } from "@/lib/files";

const HEADERS = ["name", "unit", "cost_per_unit", "category"];
const EXAMPLES = [
  ["Flour", "kg", 180, "food"],
  ["Egg", "piece", 25, "food"],
  ["Cooking Oil", "ml", 0.6, "food"],
  ["Takeaway Box - Medium", "piece", 15, "packaging"],
];

/** Add or update many ingredients from a CSV file. */
export function ImportIngredientsModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function chooseFile([file]: File[]) {
    setFileName(file.name);
    setSummary(null);
    Papa.parse(file, { header: true, skipEmptyLines: true, complete: (parsed) => setRows(parsed.data) });
  }

  async function runImport() {
    if (!rows) return;
    setImporting(true);
    const result = await importIngredients(rows);
    setImporting(false);
    if (result.ok) setSummary(result.data);
  }

  return (
    <Modal
      title="Import ingredients"
      onClose={onClose}
      footer={
        <>
          <Button variant="plain" onClick={onClose}>
            {summary ? "Close" : "Cancel"}
          </Button>
          {!summary && (
            <Button onClick={runImport} disabled={!rows?.length || importing}>
              {importing ? "Importing…" : "Import"}
            </Button>
          )}
        </>
      }
    >
      <p className="text-base text-ink-muted">
        Existing ingredients (matched by name) get their cost updated; new names are added. Menu items using an updated ingredient have their cost recalculated
        automatically.
      </p>
      <Button variant="ghost" onClick={() => downloadCsv(HEADERS, EXAMPLES, "ingredients-import-template.csv")}>
        <Download size={16} /> Download CSV template
      </Button>
      <FilePicker fileName={fileName} prompt="Choose a CSV file" accept=".csv" onFiles={chooseFile} />
      {rows && !summary && <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">Found {rows.length} row(s).</p>}
      {summary && <ImportSummaryBox summary={summary} />}
    </Modal>
  );
}
