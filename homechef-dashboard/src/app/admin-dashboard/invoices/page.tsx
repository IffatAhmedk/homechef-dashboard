"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExpensesPanel } from "@/components/ExpensesPanel";
import { InvoiceTable } from "@/components/InvoiceTable";
import { PageHeader } from "@/components/PageHeader";
import { PaidBackCard } from "@/components/PaidBackCard";
import { PayoutCheck } from "@/components/PayoutCheck";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { useAnalytics } from "@/data/analytics";
import { useInvoices } from "@/data/money";

export default function MoneyPage() {
  const { analytics: a, fromISO, toISO } = useAnalytics();
  const { data: invoices = [] } = useInvoices();
  const latest = invoices[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Money" subtitle="Costs, Foodpanda payouts and how much has been paid back." actions={<DateRangeFilter />} />

      <Section title="Costs">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard size="small" label="Ingredients" value={a?.ingredientCost ?? 0} />
          <StatCard size="small" label="Packaging" value={a?.packagingCost ?? 0} />
          <StatCard size="small" label="Workers" value={a?.labourCost ?? 0} />
          <StatCard size="small" label="Total operating cost" value={a?.totalOperatingCost ?? 0} />
        </div>
        <ExpensesPanel from={fromISO} to={toISO} />
      </Section>

      <Section title="Ingredients coming and going">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard size="small" label="Bought" value={a?.stock.purchased ?? 0} hint="Ingredients and packaging purchased" />
          <StatCard size="small" label="Used in sales" value={a?.stock.usedInSales ?? 0} hint="Cost of what the orders used up" />
          <StatCard size="small" tone="warn" label="Wasted" value={a?.stock.wastage ?? 0} hint="Spoilage and cancelled orders" />
        </div>
        <p className="text-caption text-ink-muted">Log purchases and counts on the Ingredients page. Sales and cancelled Foodpanda orders take ingredients out automatically.</p>
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Payout check">
          {latest ? (
            <PayoutCheck invoice={latest} />
          ) : (
            <p className="rounded-lg bg-card p-5 text-base text-ink-muted shadow-card">No Foodpanda invoice yet. It appears here once you upload one with your orders.</p>
          )}
        </Section>
        <Section title="Paid back">
          <PaidBackCard investment={a?.investment} />
        </Section>
      </div>

      <Section title="Payout reconciliation">
        <p className="text-base text-ink-muted">One row per Foodpanda invoice. Enter what actually landed in the bank once you check your statement — the difference shows automatically.</p>
        <InvoiceTable invoices={invoices} />
      </Section>
    </div>
  );
}
