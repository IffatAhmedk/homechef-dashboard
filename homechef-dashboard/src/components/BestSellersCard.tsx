"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DirectSummary } from "@/data/direct";

const STORAGE_KEY = "rozana-best-sellers-open";

/** The items that sold the most, top first. Collapsible, and remembers whether it's open. */
export function BestSellersCard({ items }: { items: DirectSummary["bestSellers"] }) {
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
    <Card>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-controls="best-sellers-body"
        className="flex h-10 items-center gap-2 rounded-pill px-2 font-heading text-lg text-ink hover:bg-sunken"
      >
        {open ? <ChevronDown size={20} strokeWidth={2.4} /> : <ChevronRight size={20} strokeWidth={2.4} />}
        Best sellers
        <span className="text-label font-bold text-brand">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div id="best-sellers-body" className="mt-3">
          {items.length === 0 ? (
            <p className="text-base text-ink-muted">Nothing sold yet.</p>
          ) : (
            <ol className="space-y-3">
              {items.map((item, i) => (
                <li key={item.menuItemId} className="flex items-baseline justify-between gap-3 text-base">
                  <span className="font-bold text-ink">
                    {i + 1}. {item.name}
                  </span>
                  <span className="shrink-0 text-ink-muted">{item.quantity} sold</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}
