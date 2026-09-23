"use client";

import { createContext, useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { rangeForPreset, RangePreset } from "@/lib/date-range";

export interface ProfitItem {
  menuItemId: string;
  name: string;
  quantity: number;
  profit: number;
}

export interface Analytics {
  sales: number;
  foodpandaSales: number;
  privateSales: number;
  successfulCount: number;
  cancelledCount: number;
  averageOrderValue: number;
  ingredientCost: number;
  packagingCost: number;
  labourCost: number;
  taxWithheld: number;
  foodpandaCharges: number;
  totalOperatingCost: number;
  profit: number;
  daily: { date: string; sales: number; cost: number; profit: number }[];
  profitByItem: ProfitItem[];
  bestSellers: ProfitItem[];
  stock: { purchased: number; usedInSales: number; wastage: number };
  investment: { spent: number; allTimeProfit: number; paidBackPct: number | null };
}

interface RangeState {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  setPreset: (p: RangePreset) => void;
  setCustom: (from: string, to: string) => void;
  fromISO: string;
  toISO: string;
}

const RangeContext = createContext<RangeState | null>(null);

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<RangePreset>("week");
  const [customFrom, setCustomFrom] = useState(toISODate(new Date()));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));

  const value = useMemo(() => {
    const range = rangeForPreset(preset, { from: customFrom, to: customTo });
    return {
      preset,
      customFrom,
      customTo,
      setPreset,
      setCustom: (f: string, t: string) => {
        setCustomFrom(f);
        setCustomTo(t);
      },
      fromISO: range.from.toISOString(),
      toISO: range.to.toISOString(),
    };
  }, [preset, customFrom, customTo]);

  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useDateRange must be used inside DateRangeProvider");
  return ctx;
}

export function useAnalytics() {
  const range = useDateRange();
  const { data } = useSWR<Analytics>(`/api/analytics?from=${range.fromISO}&to=${range.toISO}`, fetcher, {
    refreshInterval: 15000,
  });
  return { analytics: data, ...range };
}
