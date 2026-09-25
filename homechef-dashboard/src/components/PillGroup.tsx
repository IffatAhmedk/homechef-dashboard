import { cn } from "@/lib/utils";

interface PillGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of pill buttons where one is picked — for choosing a period, a kind of entry, a tab. */
export function PillGroup<T extends string>({ label, options, value, onChange }: PillGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "h-10 rounded-pill border px-4 text-label font-bold",
            value === option.value ? "border-ink bg-ink text-on-ink" : "border-control bg-card text-ink hover:bg-sunken"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
