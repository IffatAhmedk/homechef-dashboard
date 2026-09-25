"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { EXPENSE_CATEGORY_LABELS, formatCurrency } from "@/lib/format";
import type { Analytics } from "@/models";

function Row({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div>
        <p className="text-base text-ink">{label}</p>
        {note && <p className="text-caption text-ink-muted">{note}</p>}
      </div>
      <p className="shrink-0 text-base font-bold text-ink">{formatCurrency(value)}</p>
    </div>
  );
}

function Group({ title, total, sign, children }: { title: string; total: number; sign: "+" | "−"; children: ReactNode }) {
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

/** The right-hand panel that shows how sales turn into profit, step by step. */
export function ProfitBreakdownSheet({ analytics: a, period, onClose }: { analytics?: Analytics; period: string; onClose: () => void }) {
  const parts = a?.cutParts;
  const spending = Object.entries(a?.expensesByCategory ?? {}).filter(([, amount]) => amount > 0);
  const spendingTotal = spending.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader title="How your profit adds up" description={`Sales ${period}, from the first rupee to the last.`} />
        {!a ? (
          <p className="p-5 text-base text-ink-muted">Loading…</p>
        ) : (
          <div className="flex-1 space-y-4 p-5">
            <Group title="Sales" total={a.sales} sign="+">
              <Row label="Foodpanda sales" value={a.foodpandaSales} />
              <Row label="Private sales" value={a.privateSales} note="Includes delivery charges and tips, after any discount" />
            </Group>

            <Group title="Cost of the food" total={a.ingredientCost + a.packagingCost} sign="−">
              <Row label="Ingredients" value={a.ingredientCost} />
              <Row label="Packaging" value={a.packagingCost} />
            </Group>

            <Group title="What Foodpanda kept" total={a.foodpandaCut} sign="−">
              <Row label="Commission" value={parts?.commission ?? 0} />
              <Row label="SST on commission" value={parts?.sst ?? 0} />
              <Row label="Online-payment fee" value={parts?.onlinePayment ?? 0} />
              <Row label="Waiting-time fee" value={parts?.waitingTime ?? 0} />
              <Row label="Taxes withheld" value={parts?.tax ?? 0} note="Sales tax and income tax" />
              <Row label="Discounts you funded" value={parts?.discountsFunded ?? 0} />
              {(parts?.notYetInvoiced ?? 0) > 0 && (
                <Row label="Not split up yet" value={parts?.notYetInvoiced ?? 0} note="Orders still waiting for their weekly invoice — this total is Foodpanda's own estimate" />
              )}
            </Group>

            <Group title="Other spending" total={spendingTotal} sign="−">
              {spending.length === 0 ? (
                <p className="py-1.5 text-base text-ink-muted">Nothing logged in this period.</p>
              ) : (
                spending.map(([category, amount]) => <Row key={category} label={EXPENSE_CATEGORY_LABELS[category] ?? category} value={amount} />)
              )}
            </Group>

            <div className={`flex items-baseline justify-between gap-4 rounded-lg p-4 ${a.profit >= 0 ? "bg-leaf-soft" : "bg-danger-soft"}`}>
              <div>
                <p className="font-heading text-xl text-ink">{a.profit >= 0 ? "Net profit" : "Net loss"}</p>
                <p className="text-caption text-ink-muted">{a.sales > 0 ? `${Math.round((a.profit / a.sales) * 100)}% of sales`.replace("-", "−") : "No sales yet"}</p>
              </div>
              <p className={`text-3xl font-bold ${a.profit >= 0 ? "text-leaf" : "text-danger"}`}>{formatCurrency(a.profit)}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
