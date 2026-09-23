"use client";

import { RangePreset, rangeForPreset } from "@/lib/date-range";
import { fieldClass } from "@/components/ui";

interface Props {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "lastWeek", label: "Last week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Pick dates" },
];

const dayFormat = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short" });
const yearFormat = new Intl.DateTimeFormat("en-PK", { year: "numeric" });

function describeRange(preset: RangePreset, customFrom: string, customTo: string) {
  const { from, to } = rangeForPreset(preset, { from: customFrom, to: customTo });
  const sameDay = from.toDateString() === to.toDateString();
  const year = yearFormat.format(to);
  return sameDay ? `${dayFormat.format(from)} ${year}` : `${dayFormat.format(from)} – ${dayFormat.format(to)} ${year}`;
}

export default function DateRangeFilter({ preset, customFrom, customTo, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-col items-end gap-1">
    <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Time period">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPresetChange(p.value)}
          aria-pressed={preset === p.value}
          className={`rounded-pill border px-4 text-label font-bold ${
            preset === p.value
              ? "border-ink bg-ink text-on-ink"
              : "border-control bg-card text-ink hover:bg-sunken"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className={`${fieldClass} w-auto`}
          />
          <span className="text-ink-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className={`${fieldClass} w-auto`}
          />
        </div>
      )}
    </div>
    <p className="text-caption text-ink-muted">{describeRange(preset, customFrom, customTo)}</p>
    </div>
  );
}
