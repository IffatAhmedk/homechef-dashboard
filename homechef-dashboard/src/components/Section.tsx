import type { ReactNode } from "react";

/** A titled block of a page. */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
