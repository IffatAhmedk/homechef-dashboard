"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveInvoice } from "@/data/money";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/models";

/** What's typed into a row, as text. */
interface Draft {
  actualBankDeposit: string;
  paymentDate: string;
  pendingAmount: string;
  disputedAmount: string;
}

const draftOf = (invoice: Invoice): Draft => ({
  actualBankDeposit: invoice.actualBankDeposit != null ? String(invoice.actualBankDeposit) : "",
  paymentDate: invoice.paymentDate ? invoice.paymentDate.slice(0, 10) : "",
  pendingAmount: invoice.pendingAmount != null ? String(invoice.pendingAmount) : "",
  disputedAmount: invoice.disputedAmount != null ? String(invoice.disputedAmount) : "",
});

const numberOrNull = (text: string) => (text === "" ? null : Number(text));

/** One row per Foodpanda invoice: enter what landed in the bank and the difference shows. */
export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const draftFor = (invoice: Invoice) => drafts[invoice.id] ?? draftOf(invoice);
  const change = (invoice: Invoice, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [invoice.id]: { ...draftFor(invoice), ...patch } }));

  async function save(invoice: Invoice) {
    const draft = draftFor(invoice);
    setSaving(invoice.id);
    await saveInvoice(invoice.id, {
      actualBankDeposit: numberOrNull(draft.actualBankDeposit),
      paymentDate: draft.paymentDate || null,
      pendingAmount: numberOrNull(draft.pendingAmount),
      disputedAmount: numberOrNull(draft.disputedAmount),
    });
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== invoice.id)));
    setSaving(null);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead className="text-right">Foodpanda payout</TableHead>
            <TableHead className="text-right">Bank deposit</TableHead>
            <TableHead>Payment date</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Disputed</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const draft = draftFor(invoice);
            const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(invoice));
            const deposit = numberOrNull(draft.actualBankDeposit);
            const difference = deposit != null ? deposit - invoice.foodpandaPayout : null;
            return (
              <TableRow key={invoice.id}>
                <TableCell>
                  <p className="font-bold text-ink">{invoice.invoiceNumber}</p>
                  <p className="text-caption text-ink-muted">{formatDate(invoice.invoiceDate)}</p>
                </TableCell>
                <TableCell className="text-ink-muted">{invoice._count.orders}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(invoice.foodpandaPayout)}</TableCell>
                <TableCell>
                  <Input type="number" placeholder="—" aria-label="Bank deposit" value={draft.actualBankDeposit} onChange={(e) => change(invoice, { actualBankDeposit: e.target.value })} className="w-28 text-right" />
                </TableCell>
                <TableCell>
                  <Input type="date" aria-label="Payment date" value={draft.paymentDate} onChange={(e) => change(invoice, { paymentDate: e.target.value })} className="w-40" />
                </TableCell>
                <TableCell className={`text-right font-bold ${difference == null ? "text-ink-muted" : difference < 0 ? "text-danger" : "text-leaf"}`}>
                  {difference == null ? "—" : formatCurrency(difference)}
                </TableCell>
                <TableCell>
                  <Input type="number" placeholder="—" aria-label="Pending amount" value={draft.pendingAmount} onChange={(e) => change(invoice, { pendingAmount: e.target.value })} className="w-24 text-right" />
                </TableCell>
                <TableCell>
                  <Input type="number" placeholder="—" aria-label="Disputed amount" value={draft.disputedAmount} onChange={(e) => change(invoice, { disputedAmount: e.target.value })} className="w-24 text-right" />
                </TableCell>
                <TableCell className="text-right">
                  {dirty && (
                    <Button size="sm" disabled={saving === invoice.id} onClick={() => save(invoice)}>
                      <Save size={16} strokeWidth={2.4} /> Save
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {invoices.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No invoices yet — they&apos;re created automatically when you import Foodpanda orders + invoices.</p>}
    </>
  );
}
