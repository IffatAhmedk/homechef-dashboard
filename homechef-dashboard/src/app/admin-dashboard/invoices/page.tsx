"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Save } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatCard, PayoutCheck } from "@/components/ui";
import DateRangeFilter from "../date-range-filter";
import ExpensesPanel from "../expenses-panel";
import { useAnalytics } from "../range-context";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  foodpandaPayout: number;
  actualBankDeposit: number | null;
  paymentDate: string | null;
  pendingAmount: number | null;
  disputedAmount: number | null;
  _count: { orders: number };
}

interface Draft {
  actualBankDeposit: string;
  paymentDate: string;
  pendingAmount: string;
  disputedAmount: string;
}

function toDraft(inv: Invoice): Draft {
  return {
    actualBankDeposit: inv.actualBankDeposit != null ? String(inv.actualBankDeposit) : "",
    paymentDate: inv.paymentDate ? inv.paymentDate.slice(0, 10) : "",
    pendingAmount: inv.pendingAmount != null ? String(inv.pendingAmount) : "",
    disputedAmount: inv.disputedAmount != null ? String(inv.disputedAmount) : "",
  };
}

export default function InvoicesPage() {
  const { analytics: a, preset, customFrom, customTo, setPreset, setCustom, fromISO, toISO } = useAnalytics();
  const { data: invoices = [] } = useSWR<Invoice[]>("/api/invoices", fetcher);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function draftFor(inv: Invoice): Draft {
    return drafts[inv.id] ?? toDraft(inv);
  }

  function isDirty(inv: Invoice): boolean {
    const draft = draftFor(inv);
    const baseline = toDraft(inv);
    return JSON.stringify(draft) !== JSON.stringify(baseline);
  }

  async function save(inv: Invoice) {
    const draft = draftFor(inv);
    setSavingId(inv.id);
    await fetch(`/api/invoices/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualBankDeposit: draft.actualBankDeposit === "" ? null : Number(draft.actualBankDeposit),
        paymentDate: draft.paymentDate || null,
        pendingAmount: draft.pendingAmount === "" ? null : Number(draft.pendingAmount),
        disputedAmount: draft.disputedAmount === "" ? null : Number(draft.disputedAmount),
      }),
    });
    await mutate("/api/invoices");
    setSavingId(null);
  }

  const latest = invoices[0];
  const paidBackPct = a?.investment.paidBackPct;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-ink">Money</h1>
          <p className="text-base text-ink-muted">Costs, Foodpanda payouts and how much has been paid back.</p>
        </div>
        <DateRangeFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={setPreset}
          onCustomChange={setCustom}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-ink">Costs</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard size="small" label="Ingredients" value={a?.ingredientCost ?? 0} />
          <StatCard size="small" label="Packaging" value={a?.packagingCost ?? 0} />
          <StatCard size="small" label="Workers" value={a?.labourCost ?? 0} />
          <StatCard size="small" label="Total operating cost" value={a?.totalOperatingCost ?? 0} />
        </div>
        <ExpensesPanel from={fromISO} to={toISO} />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-ink">Ingredients coming and going</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard size="small" label="Bought" value={a?.stock.purchased ?? 0} hint="Ingredients and packaging purchased" />
          <StatCard size="small" label="Used in sales" value={a?.stock.usedInSales ?? 0} hint="Cost of what the orders used up" />
          <StatCard size="small" tone="warn" label="Wasted" value={a?.stock.wastage ?? 0} hint="Spoilage and cancelled orders" />
        </div>
        <p className="text-caption text-ink-muted">
          Log purchases and counts on the Ingredients page. Sales and cancelled Foodpanda orders take ingredients out
          automatically.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-heading text-xl text-ink">Payout check</h2>
          {latest ? (
            <PayoutCheck invoice={latest} />
          ) : (
            <p className="rounded-lg bg-card p-5 text-base text-ink-muted shadow-card">
              No Foodpanda invoice yet. It appears here once you upload one with your orders.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl text-ink">Paid back</h2>
          <div className="rounded-lg bg-card p-5 shadow-card">
            {paidBackPct == null || !a ? (
              <p className="text-base text-ink-muted">
                Add your startup and packaging spending as expenses to see how much of it has been paid back.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-caption text-ink-muted">Spent</p>
                    <p className="text-xl font-bold text-ink">{formatCurrency(a.investment.spent)}</p>
                  </div>
                  <div>
                    <p className="text-caption text-ink-muted">Profit so far</p>
                    <p className={`text-xl font-bold ${a.investment.allTimeProfit >= 0 ? "text-leaf" : "text-danger"}`}>
                      {formatCurrency(a.investment.allTimeProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-ink-muted">Paid back</p>
                    <p className="text-xl font-bold text-ink">{Math.round(paidBackPct)}%</p>
                  </div>
                </div>
                <div className="mt-3 h-3 rounded-sm bg-sunken" role="img" aria-label={`${Math.round(paidBackPct)} percent paid back`}>
                  <div className="h-3 rounded-sm bg-leaf" style={{ width: `${paidBackPct}%` }} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-ink">Payout reconciliation</h2>
        <p className="text-base text-ink-muted">
          One row per Foodpanda invoice. Enter what actually landed in the bank once you check your statement —
          the difference shows automatically.
        </p>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="px-4 py-3 font-bold">Invoice</th>
              <th className="px-4 py-3 font-bold">Orders</th>
              <th className="px-4 py-3 text-right font-bold">Foodpanda payout</th>
              <th className="px-4 py-3 text-right font-bold">Bank deposit</th>
              <th className="px-4 py-3 font-bold">Payment date</th>
              <th className="px-4 py-3 text-right font-bold">Difference</th>
              <th className="px-4 py-3 text-right font-bold">Pending</th>
              <th className="px-4 py-3 text-right font-bold">Disputed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((inv) => {
              const draft = draftFor(inv);
              const dirty = isDirty(inv);
              const bankDeposit = draft.actualBankDeposit === "" ? null : Number(draft.actualBankDeposit);
              const difference = bankDeposit != null ? bankDeposit - inv.foodpandaPayout : null;
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{inv.invoiceNumber}</p>
                    <p className="text-xs text-ink-muted">{formatDate(inv.invoiceDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{inv._count.orders}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatCurrency(inv.foodpandaPayout)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      placeholder="—"
                      value={draft.actualBankDeposit}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [inv.id]: { ...draft, actualBankDeposit: e.target.value } }))
                      }
                      className="w-24 rounded border border-line px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={draft.paymentDate}
                      onChange={(e) => setDrafts((d) => ({ ...d, [inv.id]: { ...draft, paymentDate: e.target.value } }))}
                      className="rounded border border-line px-2 py-1 text-sm"
                    />
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      difference == null ? "text-ink-muted" : difference < 0 ? "text-danger" : "text-leaf"
                    }`}
                  >
                    {difference == null ? "—" : formatCurrency(difference)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      placeholder="—"
                      value={draft.pendingAmount}
                      onChange={(e) => setDrafts((d) => ({ ...d, [inv.id]: { ...draft, pendingAmount: e.target.value } }))}
                      className="w-20 rounded border border-line px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      placeholder="—"
                      value={draft.disputedAmount}
                      onChange={(e) => setDrafts((d) => ({ ...d, [inv.id]: { ...draft, disputedAmount: e.target.value } }))}
                      className="w-20 rounded border border-line px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {dirty && (
                      <button
                        onClick={() => save(inv)}
                        disabled={savingId === inv.id}
                        className="flex items-center gap-1 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
                      >
                        <Save size={12} /> Save
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-muted">
            No invoices yet — they&apos;re created automatically when you import Foodpanda orders + invoices.
          </p>
        )}
      </div>
      </section>
    </div>
  );
}
