import type { ReactNode } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowDown, ArrowUp, Clock, AlertTriangle, Check, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export const btnPrimary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-pill bg-brand px-6 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50";
export const btnSecondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-pill border border-control bg-card px-6 text-label font-bold text-ink hover:bg-sunken";
export const btnQuiet =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-pill px-4 text-label font-bold text-brand hover:bg-brand-soft";
export const fieldClass =
  "w-full rounded-sm border border-control bg-card px-4 text-base text-ink";

type Tone = "neutral" | "good" | "bad" | "warn" | "info" | "brand";

const TONE_BADGE: Record<Tone, string> = {
  neutral: "bg-stone-soft text-stone",
  info: "bg-stone-soft text-stone",
  good: "bg-leaf-soft text-leaf",
  bad: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  brand: "bg-brand-soft text-brand-deep",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-4 py-1 text-caption font-bold ${TONE_BADGE[tone]}`}>
      {children}
    </span>
  );
}

const TONE_CARD: Record<Tone, string> = {
  neutral: "bg-card",
  info: "bg-card",
  brand: "bg-card",
  warn: "bg-warn-soft",
  good: "bg-leaf-soft",
  bad: "bg-danger-soft",
};
const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-ink",
  info: "text-ink",
  brand: "text-ink",
  warn: "text-warn",
  good: "text-leaf",
  bad: "text-danger",
};

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--stone)",
  info: "var(--stone)",
  brand: "var(--brand)",
  warn: "var(--warn)",
  good: "var(--leaf)",
  bad: "var(--danger)",
};

/** One money answer: a label, a big number, a plain-words hint and (optionally) a trend line. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  size = "kpi",
  format = "money",
  icon: Icon,
  series,
  onClick,
}: {
  label: string;
  value: number;
  hint?: ReactNode;
  tone?: Tone;
  size?: "kpi" | "small";
  format?: "money" | "count" | "percent";
  icon?: LucideIcon;
  series?: { date: string; value: number }[];
  onClick?: () => void;
}) {
  const compact = size === "small";
  const color = TONE_COLOR[tone];
  const gradientId = `spark-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <div
      className={`overflow-hidden rounded-lg shadow-card ${TONE_CARD[tone]} ${onClick ? "cursor-pointer transition hover:ring-2 hover:ring-brand" : ""}`}
      {...(onClick
        ? {
            role: "button",
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <div className={compact ? "p-4" : "p-5 pb-2"}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-label font-bold text-ink-muted">{label}</p>
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-sunken" style={{ color }}>
              <Icon size={18} strokeWidth={2.2} />
            </span>
          )}
        </div>
        <p className={`mt-1 font-bold ${compact ? "text-xl" : "text-5xl"} ${TONE_VALUE[tone]}`}>
          {format === "count"
            ? value.toLocaleString("en-PK")
            : format === "percent"
              ? `${Math.round(value)}%`.replace("-", "−")
              : formatCurrency(value)}
        </p>
        {hint && <p className="mt-1 flex items-center gap-1 text-caption text-ink-muted">{hint}</p>}
      </div>
      {series && series.length > 1 && (
        <div className="h-14 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.35 }} />
                  <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

interface ProfitRow {
  menuItemId: string;
  name: string;
  quantity: number;
  profit: number;
}

/** Every item, best first. Losses sit at the bottom in red with the word Loss. */
export function MenuProfitBars({ rows }: { rows: ProfitRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  if (rows.length === 0) return <p className="text-body text-ink-muted">No sales in this period yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r, index) => {
        const loss = r.profit < 0;
        const best = index === 0 && !loss;
        return (
          <li key={r.menuItemId}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body font-bold text-ink">{r.name}</span>
              <span className={`flex items-center gap-1 text-body font-bold ${loss ? "text-danger" : "text-leaf"}`}>
                {loss ? <ArrowDown size={16} strokeWidth={2.4} /> : <ArrowUp size={16} strokeWidth={2.4} />}
                {loss ? "Loss " : "Profit "}
                {formatCurrency(Math.abs(r.profit))}
              </span>
            </div>
            <div className="mt-1 h-4 rounded-sm bg-sunken">
              <div
                className={`h-4 rounded-sm ${loss ? "bg-danger" : best ? "bg-terracotta" : "bg-leaf"}`}
                style={{ width: `${Math.max(2, (Math.abs(r.profit) / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface PayoutInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  foodpandaPayout: number;
  actualBankDeposit: number | null;
  pendingAmount: number | null;
  disputedAmount: number | null;
}

/** Foodpanda's payout for an invoice against what actually landed in the bank. */
export function PayoutCheck({ invoice }: { invoice: PayoutInvoice }) {
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
