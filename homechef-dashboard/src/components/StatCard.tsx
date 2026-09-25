"use client";

import type { ReactNode } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Tone = "neutral" | "good" | "bad" | "warn";

const TONE_CARD: Record<Tone, string> = {
  neutral: "bg-card",
  warn: "bg-warn-soft",
  good: "bg-leaf-soft",
  bad: "bg-danger-soft",
};
const TONE_VALUE: Record<Tone, string> = {
  neutral: "text-ink",
  warn: "text-warn",
  good: "text-leaf",
  bad: "text-danger",
};

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--stone)",
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
