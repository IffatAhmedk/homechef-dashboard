"use client";

import { createContext, useContext, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { rangeForPreset, type RangePreset } from "@/lib/date-range";
import type { Analytics } from "@/models";

interface DateRangeState {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  setPreset: (preset: RangePreset) => void;
  setCustom: (from: string, to: string) => void;
  fromISO: string;
  toISO: string;
}

const DateRangeContext = createContext<DateRangeState | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

/** Holds the period picked on any page (this week, last week, …) so every page shows the same one. */
export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<RangePreset>("week");
  const [customFrom, setCustomFrom] = useState(today());
  const [customTo, setCustomTo] = useState(today());

  const value = useMemo(() => {
    const range = rangeForPreset(preset, { from: customFrom, to: customTo });
    return {
      preset,
      customFrom,
      customTo,
      setPreset,
      setCustom: (from: string, to: string) => {
        setCustomFrom(from);
        setCustomTo(to);
      },
      fromISO: range.from.toISOString(),
      toISO: range.to.toISOString(),
    };
  }, [preset, customFrom, customTo]);

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used inside DateRangeProvider");
  return ctx;
}

/** The numbers for the picked period, plus the period itself. */
export function useAnalytics() {
  const range = useDateRange();
  const { data } = useSWR<Analytics>(`/api/analytics?from=${range.fromISO}&to=${range.toISO}`, fetcher, { refreshInterval: 15000 });
  return { analytics: data, ...range };
}
