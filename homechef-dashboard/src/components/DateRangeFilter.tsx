"use client";

import { rangeForPreset, type RangePreset } from "@/lib/date-range";
import { Input } from "@/components/ui/input";
import { PillGroup } from "@/components/PillGroup";
import { useDateRange } from "@/data/analytics";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Pick dates" },
];

const dayFormat = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short" });
const yearFormat = new Intl.DateTimeFormat("en-PK", { year: "numeric" });

function describeRange(preset: RangePreset, from: string, to: string) {
  const range = rangeForPreset(preset, { from, to });
  const year = yearFormat.format(range.to);
  if (range.from.toDateString() === range.to.toDateString()) return `${dayFormat.format(range.from)} ${year}`;
  return `${dayFormat.format(range.from)} – ${dayFormat.format(range.to)} ${year}`;
}

/** The period picker shown at the top right of pages. It shares its choice with every other page. */
export function DateRangeFilter() {
  const { preset, customFrom, customTo, setPreset, setCustom } = useDateRange();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <PillGroup label="Time period" options={PRESETS} value={preset} onChange={setPreset} />
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="From date" value={customFrom} onChange={(e) => setCustom(e.target.value, customTo)} className="w-auto" />
            <span className="text-ink-muted">to</span>
            <Input type="date" aria-label="To date" value={customTo} onChange={(e) => setCustom(customFrom, e.target.value)} className="w-auto" />
          </div>
        )}
      </div>
      <p className="text-caption text-ink-muted">{describeRange(preset, customFrom, customTo)}</p>
    </div>
  );
}
