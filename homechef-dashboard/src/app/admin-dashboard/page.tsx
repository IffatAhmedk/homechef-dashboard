"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { AddOrderModal } from "@/components/AddOrderModal";
import { BestSellersCard } from "@/components/BestSellersCard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { FinancialCards } from "@/components/FinancialCards";
import { ImportOrdersModal } from "@/components/ImportOrdersModal";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { OrderTable } from "@/components/OrderTable";
import { ProfitBreakdownSheet } from "@/components/ProfitBreakdownSheet";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { useAnalytics } from "@/data/analytics";
import { useOrders } from "@/data/orders";
import type { RangePreset } from "@/lib/date-range";

const PERIOD_WORDS: Record<RangePreset, string> = {
  week: "this week",
  lastWeek: "last week",
  month: "this month",
  custom: "in this period",
};

type Window = "import" | "add" | "profit" | { orderId: string } | null;

export default function OverviewPage() {
  const { analytics: a, preset, fromISO, toISO } = useAnalytics();
  const { data: orders = [] } = useOrders(fromISO, toISO);
  const [open, setOpen] = useState<Window>(null);
  const close = () => setOpen(null);
  const period = PERIOD_WORDS[preset];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-ink">Assalam o Alaikum, Ammi</h1>
          <p className="text-base text-ink-muted">Here is how Rozana is doing {period}.</p>
        </div>
        <DateRangeFilter />
      </div>

      <FinancialCards analytics={a} period={period} onProfitClick={() => setOpen("profit")} />

      <Section title="Where the money went">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard size="small" label="Foodpanda sales" value={a?.foodpandaSales ?? 0} />
          <StatCard size="small" label="Private sales" value={a?.privateSales ?? 0} />
          <StatCard size="small" label="Average order" value={a?.averageOrderValue ?? 0} />
          <StatCard size="small" label="Tax withheld" value={a?.taxWithheld ?? 0} hint="Sales and income tax" />
          <StatCard size="small" label="Foodpanda charges" value={a?.foodpandaCharges ?? 0} hint="Commission, fees, SST" />
        </div>
      </Section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl text-ink">Order history</h2>
            <Badge tone="good">{a?.successfulCount ?? 0} successful</Badge>
            <Badge tone="warn">{a?.cancelledCount ?? 0} wastage</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOpen("import")}>
              <Upload size={16} strokeWidth={2.4} /> Upload orders
            </Button>
            <Button onClick={() => setOpen("add")}>
              <Plus size={16} strokeWidth={2.4} /> Add an order
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_7fr]">
          <BestSellersCard items={a?.bestSellers ?? []} />
          <div className="space-y-2">
            <OrderTable orders={orders} limit={10} onSelect={(order) => setOpen({ orderId: order.id })} />
            <Link href="/admin-dashboard/orders" className={buttonVariants({ variant: "ghost" })}>
              See all orders
            </Link>
          </div>
        </div>
      </section>

      {open === "profit" && <ProfitBreakdownSheet analytics={a} period={period} onClose={close} />}
      {open === "import" && <ImportOrdersModal onClose={close} />}
      {open === "add" && <AddOrderModal onClose={close} />}
      {typeof open === "object" && open && <OrderDetailSheet orderId={open.orderId} onClose={close} />}
    </div>
  );
}
