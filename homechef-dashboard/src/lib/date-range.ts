export type RangePreset = "week" | "month" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function rangeForPreset(preset: RangePreset, custom?: { from: string; to: string }): DateRange {
  const now = new Date();

  if (preset === "week") {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday));
    return { from, to: endOfDay(now) };
  }

  if (preset === "month") {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { from, to: endOfDay(now) };
  }

  if (custom?.from && custom?.to) {
    return { from: startOfDay(new Date(custom.from)), to: endOfDay(new Date(custom.to)) };
  }

  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return { from, to: endOfDay(now) };
}

export function eachDay({ from, to }: DateRange): string[] {
  const days: string[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
