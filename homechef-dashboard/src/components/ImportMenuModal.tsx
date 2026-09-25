"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/FilePicker";
import { ImportSummaryBox } from "@/components/ImportSummaryBox";
import { Modal } from "@/components/Modal";
import { PillGroup } from "@/components/PillGroup";
import type { ImportSummary } from "@/data/ingredients";
import { importMenuItems, importRecipes } from "@/data/menu";
import { downloadCsv, downloadXlsx, readSpreadsheet } from "@/lib/files";

type Kind = "items" | "recipes";

const KINDS = {
  items: {
    help: "Existing items (matched by name) get updated; new ones are added, and new categories are created automatically. Cost price is skipped for items whose cost comes from a recipe.",
    headers: ["category", "name", "description", "price", "cost_price", "stock_qty", "available"],
    examples: [
      ["Rotis & Breads", "Plain Paratha", "Fresh whole wheat paratha", 120, 50, 50, "yes"],
      ["Sweets", "Doodh Patti", "Traditional milk tea", 150, 40, 50, "yes"],
    ],
    sheet: "Menu items",
    file: "menu-items-template",
    run: importMenuItems,
  },
  recipes: {
    help: "One row per ingredient. Both the menu item and its ingredients must already exist — import ingredients and menu items first.",
    headers: ["menu_item", "component_type", "component_name", "quantity"],
    examples: [
      ["Plain Paratha", "ingredient", "Flour", 150],
      ["Plain Paratha", "ingredient", "Cooking Oil", 20],
    ],
    sheet: "Recipes",
    file: "recipes-template",
    run: importRecipes,
  },
};

/** Add or update menu items, or recipes, from a CSV or Excel file. */
export function ImportMenuModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("items");
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const config = KINDS[kind];

  function changeKind(next: Kind) {
    setKind(next);
    setRows(null);
    setFileName("");
    setSummary(null);
  }

  async function chooseFile([file]: File[]) {
    setFileName(file.name);
    setSummary(null);
    setRows(await readSpreadsheet(file));
  }

  async function runImport() {
    if (!rows) return;
    setImporting(true);
    const result = await config.run(rows);
    setImporting(false);
    if (result.ok) setSummary(result.data);
  }

  return (
    <Modal
      title="Import menu"
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
      <PillGroup
        label="What to import"
        options={[
          { value: "items", label: "Menu items" },
          { value: "recipes", label: "Recipes" },
        ]}
        value={kind}
        onChange={changeKind}
      />
      <p className="text-base text-ink-muted">{config.help}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => downloadXlsx(config.headers, config.examples, config.sheet, `${config.file}.xlsx`)}>
          <Download size={16} /> Download Excel template
        </Button>
        <Button variant="ghost" onClick={() => downloadCsv(config.headers, config.examples, `${config.file}.csv`)}>
          <Download size={16} /> Download CSV template
        </Button>
      </div>
      <FilePicker fileName={fileName} prompt="Choose a CSV or Excel file" accept=".csv,.xlsx,.xls" onFiles={chooseFile} />
      {rows && !summary && <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">Found {rows.length} row(s).</p>}
      {summary && <ImportSummaryBox summary={summary} />}
    </Modal>
  );
}
