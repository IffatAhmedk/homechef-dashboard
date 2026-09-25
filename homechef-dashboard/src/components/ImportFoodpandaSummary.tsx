"use client";

import { useState } from "react";
import Papa from "papaparse";
import { FilePicker } from "@/components/FilePicker";
import { ImportActions } from "@/components/ImportActions";
import { importOrders } from "@/data/orders";
import { parseMoney } from "@/lib/foodpanda";

interface Day {
  date: string;
  sales: number;
  orders: number;
  cancelled: number;
}
interface Dish {
  name: string;
  quantity: number;
  sales: number;
}
interface SummaryResult {
  imported: number;
  skipped: number;
  orderCount: number;
  unmatchedDishes: string[];
}

function readCsv(file: File) {
  return new Promise<Record<string, string>[]>((resolve) => {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: (parsed) => resolve(parsed.data) });
  });
}

/** Foodpanda's "Orders per day" report (and optionally "Popular dishes"): totals per day, split into estimated orders. */
export function ImportFoodpandaSummary({ onClose }: { onClose: () => void }) {
  const [daysFile, setDaysFile] = useState("");
  const [dishesFile, setDishesFile] = useState("");
  const [days, setDays] = useState<Day[] | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);

  async function chooseDays([file]: File[]) {
    setDaysFile(file.name);
    setResult(null);
    const rows = await readCsv(file);
    setDays(rows.map((r) => ({ date: r.Date, sales: parseMoney(r.Sales), orders: Number(r.Orders) || 0, cancelled: Number(r.Cancelled) || 0 })));
  }

  async function chooseDishes([file]: File[]) {
    setDishesFile(file.name);
    setResult(null);
    const rows = await readCsv(file);
    setDishes(rows.map((r) => ({ name: r.Dish, quantity: Number(r.Total) || 0, sales: parseMoney(r.Sales) })));
  }

  async function runImport() {
    setImporting(true);
    const response = await importOrders<SummaryResult>("foodpanda-summary", { days, dishes });
    setImporting(false);
    if (response.ok) setResult(response.data);
  }

  return (
    <>
      <p className="text-base text-ink-muted">
        Upload the exports from your Foodpanda vendor portal — Reports → Orders per day (required) and Popular dishes (optional, used to estimate cost of goods).
      </p>
      <div>
        <p className="mb-1 text-caption font-bold text-ink-muted">Orders per day CSV (required)</p>
        <FilePicker fileName={daysFile} prompt="Choose ordersPerDay.csv" accept=".csv" onFiles={chooseDays} />
      </div>
      <div>
        <p className="mb-1 text-caption font-bold text-ink-muted">Popular dishes CSV (recommended, for item-level detail)</p>
        <FilePicker fileName={dishesFile} prompt="Choose popularDishes.csv" accept=".csv" onFiles={chooseDishes} />
      </div>

      {days && !result && (
        <p className="rounded-lg bg-sunken p-3 text-base text-ink-muted">
          Found {days.length} day(s). Each day&apos;s real order count is kept — its sales are split evenly across that many orders, and the popular dishes are
          spread across them so item quantity, cost and profit stay trackable.
        </p>
      )}

      {result && (
        <>
          <p className="rounded-lg bg-leaf-soft p-3 text-base text-leaf">
            Imported {result.orderCount} order(s) across {result.imported} day(s){result.skipped > 0 ? `, skipped ${result.skipped} empty day(s)` : ""}.
          </p>
          {result.unmatchedDishes.length > 0 && (
            <p className="rounded-lg bg-sunken p-3 text-caption text-ink-muted">
              {result.unmatchedDishes.length} dish(es) didn&apos;t match a menu item, so their quantity and cost aren&apos;t counted — add them in Menu & Inventory:{" "}
              {result.unmatchedDishes.join(", ")}
            </p>
          )}
        </>
      )}

      <ImportActions done={!!result} canImport={!!days?.length} importing={importing} onImport={runImport} onClose={onClose} />
    </>
  );
}
