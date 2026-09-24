"use client";

import { X } from "lucide-react";
import { formatCurrency, EXPENSE_CATEGORY_LABELS } from "@/lib/format";
import type { Analytics } from "./range-context";

function Row({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div>
        <p className="text-base text-ink">{label}</p>
        {sub && <p className="text-caption text-ink-muted">{sub}</p>}
      </div>
      <p className={`shrink-0 text-base font-bold ${tone === "good" ? "text-leaf" : tone === "bad" ? "text-danger" : "text-ink"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function Group({ title, total, sign, children }: { title: string; total: number; sign: "+" | "−"; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-sunken p-4">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h3 className="font-heading text-lg text-ink">{title}</h3>
        <p className="text-base font-bold text-ink">
          {sign}
          {formatCurrency(Math.abs(total))}
        </p>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export default function ProfitBreakdownPanel({
  analytics: a,
  periodLabel,
  onClose,
}: {
  analytics: Analytics | undefined;
  periodLabel: string;
  onClose: () => void;
}) {
  const parts = a?.cutParts;
  const expenseRows = Object.entries(a?.expensesByCategory ?? {}).filter(([, v]) => v > 0);
  const expenseTotal = expenseRows.reduce((sum, [, v]) => sum + v, 0);
  const foodCost = (a?.ingredientCost ?? 0) + (a?.packagingCost ?? 0);

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <aside
        aria-label="Profit breakdown"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-heading text-2xl text-ink">How your profit adds up</h2>
            <p className="text-caption text-ink-muted">Sales {periodLabel}, from the first rupee to the last.</p>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-4 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        {!a ? (
          <p className="p-5 text-base text-ink-muted">Loading…</p>
        ) : (
          <div className="flex-1 space-y-4 p-5">
            <Group title="Sales" total={a.sales} sign="+">
              <Row label="Foodpanda sales" value={a.foodpandaSales} />
              <Row label="Private sales" value={a.privateSales} sub="Includes delivery charges and tips, after any discount" />
            </Group>

            <Group title="Cost of the food" total={foodCost} sign="−">
              <Row label="Ingredients" value={a.ingredientCost} />
              <Row label="Packaging" value={a.packagingCost} />
            </Group>

            <Group title="What Foodpanda kept" total={a.foodpandaCut} sign="−">
              <Row label="Commission" value={parts?.commission ?? 0} />
              <Row label="SST on commission" value={parts?.sst ?? 0} />
              <Row label="Online-payment fee" value={parts?.onlinePayment ?? 0} />
              <Row label="Waiting-time fee" value={parts?.waitingTime ?? 0} />
              <Row label="Taxes withheld" value={parts?.tax ?? 0} sub="Sales tax and income tax" />
              <Row label="Discounts you funded" value={parts?.discountsFunded ?? 0} />
              {(parts?.notYetInvoiced ?? 0) > 0 && (
                <Row
                  label="Not split up yet"
                  value={parts?.notYetInvoiced ?? 0}
                  sub="Orders still waiting for their weekly invoice — this total is Foodpanda's own estimate"
                />
              )}
            </Group>

            <Group title="Other spending" total={expenseTotal} sign="−">
              {expenseRows.length === 0 ? (
                <p className="py-1.5 text-base text-ink-muted">Nothing logged in this period.</p>
              ) : (
                expenseRows.map(([category, amount]) => (
                  <Row key={category} label={EXPENSE_CATEGORY_LABELS[category] ?? category} value={amount} />
                ))
              )}
            </Group>

            <div
              className={`flex items-baseline justify-between gap-4 rounded-lg p-4 ${a.profit >= 0 ? "bg-leaf-soft" : "bg-danger-soft"}`}
            >
              <div>
                <p className="font-heading text-xl text-ink">{a.profit >= 0 ? "Net profit" : "Net loss"}</p>
                <p className="text-caption text-ink-muted">
                  {a.sales > 0 ? `${Math.round((a.profit / a.sales) * 100)}% of sales`.replace("-", "−") : "No sales yet"}
                </p>
              </div>
              <p className={`text-3xl font-bold ${a.profit >= 0 ? "text-leaf" : "text-danger"}`}>{formatCurrency(a.profit)}</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
