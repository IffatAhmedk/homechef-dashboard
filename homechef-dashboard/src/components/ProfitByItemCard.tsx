"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { MenuProfitBars } from "@/components/MenuProfitBars";
import { useAnalytics } from "@/data/analytics";

const STORAGE_KEY = "rozana-profit-by-item-open";

/** Profit for every menu item, best first. It can be hidden, and remembers that. */
export function ProfitByItemCard() {
  const { analytics } = useAnalytics();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORAGE_KEY) === "0") setOpen(false);
    } catch {}
  }, []);

  function toggle() {
    setOpen(!open);
    try {
      localStorage.setItem(STORAGE_KEY, open ? "0" : "1");
    } catch {}
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-controls="profit-by-item-body"
          className="flex h-10 items-center gap-2 rounded-pill px-2 font-heading text-xl text-ink hover:bg-sunken"
        >
          {open ? <ChevronDown size={20} strokeWidth={2.4} /> : <ChevronRight size={20} strokeWidth={2.4} />}
          Profit by menu item
          <span className="text-label font-bold text-brand">{open ? "Hide" : "Show"}</span>
        </button>
        {open && <DateRangeFilter />}
      </div>
      {open && (
        <div id="profit-by-item-body">
          <MenuProfitBars rows={analytics?.profitByItem ?? []} />
        </div>
      )}
    </Card>
  );
}
