"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Save } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, formatDate } from "@/lib/format";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-charcoal">Payout reconciliation</h1>
        <p className="text-sm text-charcoal/50">
          One row per Foodpanda invoice. Enter what actually landed in the bank once you check your statement —
          the difference shows automatically.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-warm-beige/40 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-beige/30 text-left text-xs uppercase text-charcoal/40">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 text-right font-medium">Foodpanda payout</th>
              <th className="px-4 py-3 text-right font-medium">Bank deposit</th>
              <th className="px-4 py-3 font-medium">Payment date</th>
              <th className="px-4 py-3 text-right font-medium">Difference</th>
              <th className="px-4 py-3 text-right font-medium">Pending</th>
              <th className="px-4 py-3 text-right font-medium">Disputed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-beige/20">
            {invoices.map((inv) => {
              const draft = draftFor(inv);
              const dirty = isDirty(inv);
              const bankDeposit = draft.actualBankDeposit === "" ? null : Number(draft.actualBankDeposit);
              const difference = bankDeposit != null ? bankDeposit - inv.foodpandaPayout : null;
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-charcoal">{inv.invoiceNumber}</p>
                    <p className="text-xs text-charcoal/40">{formatDate(inv.invoiceDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-charcoal/60">{inv._count.orders}</td>
                  <td className="px-4 py-3 text-right font-medium text-charcoal">{formatCurrency(inv.foodpandaPayout)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      placeholder="—"
                      value={draft.actualBankDeposit}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [inv.id]: { ...draft, actualBankDeposit: e.target.value } }))
                      }
                      className="w-24 rounded border border-warm-beige/40 px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={draft.paymentDate}
                      onChange={(e) => setDrafts((d) => ({ ...d, [inv.id]: { ...draft, paymentDate: e.target.value } }))}
                      className="rounded border border-warm-beige/40 px-2 py-1 text-sm"
                    />
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      difference == null ? "text-charcoal/30" : difference < 0 ? "text-maroon" : "text-sage"
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
                      className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      placeholder="—"
                      value={draft.disputedAmount}
                      onChange={(e) => setDrafts((d) => ({ ...d, [inv.id]: { ...draft, disputedAmount: e.target.value } }))}
                      className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {dirty && (
                      <button
                        onClick={() => save(inv)}
                        disabled={savingId === inv.id}
                        className="flex items-center gap-1 rounded-lg bg-terracotta px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
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
          <p className="p-6 text-center text-sm text-charcoal/40">
            No invoices yet — they&apos;re created automatically when you import Foodpanda orders + invoices.
          </p>
        )}
      </div>
    </div>
  );
}
