"use client";

import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
  data: { date: string; value: number }[];
  color: string;
  tone: "sage" | "terracotta" | "maroon";
}

const TONE_CLASSES: Record<Props["tone"], { bg: string; text: string; icon: string }> = {
  sage: { bg: "bg-sage/10", text: "text-sage", icon: "text-sage" },
  terracotta: { bg: "bg-terracotta/10", text: "text-terracotta", icon: "text-terracotta" },
  maroon: { bg: "bg-maroon/10", text: "text-maroon", icon: "text-maroon" },
};

export default function KpiCard({ label, value, icon: Icon, hint, data, color, tone }: Props) {
  const classes = TONE_CLASSES[tone];
  const gradientId = `kpi-gradient-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className={`overflow-hidden rounded-2xl border border-warm-beige/40 bg-white`}>
      <div className="flex items-start justify-between p-5 pb-2">
        <div>
          <p className="text-sm font-medium text-charcoal/50">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">{formatCurrency(value)}</p>
          {hint && <p className={`mt-1 text-xs font-medium ${classes.text}`}>{hint}</p>}
        </div>
        <div className={`rounded-full ${classes.bg} p-2`}>
          <Icon size={16} className={classes.icon} />
        </div>
      </div>
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              labelFormatter={() => ""}
              contentStyle={{ borderRadius: 8, border: "1px solid #d9c3a8", fontSize: 12, padding: "4px 8px" }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
