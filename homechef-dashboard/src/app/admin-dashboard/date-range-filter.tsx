"use client";

import { RangePreset } from "@/lib/date-range";

interface Props {
  preset: RangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: RangePreset) => void;
  onCustomChange: (from: string, to: string) => void;
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

export default function DateRangeFilter({ preset, customFrom, customTo, onPresetChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-warm-beige/50 bg-white p-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              preset === p.value ? "bg-terracotta text-white" : "text-charcoal/60 hover:bg-warm-beige/20"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-lg border border-warm-beige/60 px-2 py-1.5 text-sm"
          />
          <span className="text-charcoal/40">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="rounded-lg border border-warm-beige/60 px-2 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
