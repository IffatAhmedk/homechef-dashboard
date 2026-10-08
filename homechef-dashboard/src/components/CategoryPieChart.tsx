"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "var(--brand)",
  "var(--leaf)",
  "var(--terracotta)",
  "var(--warn)",
  "var(--stone)",
  "var(--danger)",
  "var(--brand-deep)",
  "var(--ink-muted)",
];

interface Slice {
  name: string;
  value: number;
}

/** How spending splits across categories, for the period shown. */
export function CategoryPieChart({ data }: { data: Slice[] }) {
  const shown = data.filter((d) => d.value > 0);
  if (shown.length === 0) return <p className="text-base text-ink-muted">Nothing logged in this period.</p>;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
            {shown.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend wrapperStyle={{ fontSize: 14 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
