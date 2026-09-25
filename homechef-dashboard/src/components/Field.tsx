import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  /** Use when the field holds several controls (e.g. an amount and its unit), so it isn't wrapped in a <label>. */
  group?: boolean;
  children: ReactNode;
}

/** A form field: a bold label above its control, with an optional hint underneath. */
export function Field({ label, hint, group, children }: FieldProps) {
  const Wrapper = group ? "div" : "label";
  return (
    <Wrapper className="block">
      <span className="block text-label font-bold text-ink-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-caption text-ink-muted">{hint}</span>}
    </Wrapper>
  );
}
