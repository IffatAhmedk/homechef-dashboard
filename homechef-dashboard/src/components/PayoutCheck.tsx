import { AlertTriangle, Check, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/models";
import { Badge } from "@/components/ui/badge";

/** Foodpanda's payout for an invoice against what actually landed in the bank. */
export function PayoutCheck({ invoice }: { invoice: Invoice }) {
  const received = invoice.actualBankDeposit;
  const difference = received == null ? null : received - invoice.foodpandaPayout;
  const matches = difference != null && Math.abs(difference) < 1;
  return (
    <div className="rounded-lg bg-card p-6 shadow-card">
      <p className="text-label font-bold text-ink-muted">Invoice {invoice.invoiceNumber}</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-caption text-ink-muted">Foodpanda says you get</p>
          <p className="text-2xl font-bold text-ink">{formatCurrency(invoice.foodpandaPayout)}</p>
        </div>
        <div>
          <p className="text-caption text-ink-muted">Bank received</p>
          <p className="text-2xl font-bold text-ink">{received == null ? "Not entered yet" : formatCurrency(received)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {received == null ? (
          <Badge tone="warn">
            <Clock size={16} strokeWidth={2.4} /> Waiting for the bank amount
          </Badge>
        ) : matches ? (
          <Badge tone="good">
            <Check size={16} strokeWidth={2.4} /> Everything matches. Nothing to chase.
          </Badge>
        ) : (
          <Badge tone="bad">
            <AlertTriangle size={16} strokeWidth={2.4} /> Short by {formatCurrency(Math.abs(difference ?? 0))}
          </Badge>
        )}
        {(invoice.pendingAmount ?? 0) > 0 && <Badge tone="warn">Pending {formatCurrency(invoice.pendingAmount ?? 0)}</Badge>}
        {(invoice.disputedAmount ?? 0) > 0 && <Badge tone="bad">Disputed {formatCurrency(invoice.disputedAmount ?? 0)}</Badge>}
      </div>
    </div>
  );
}
