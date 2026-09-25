import type { ImportSummary } from "@/data/ingredients";

/** "3 created, 2 updated" plus any rows that had problems. */
export function ImportSummaryBox({ summary }: { summary: ImportSummary }) {
  return (
    <>
      <p className="rounded-lg bg-leaf-soft p-3 text-base text-leaf">
        {summary.created} created, {summary.updated} updated.
      </p>
      {summary.errors.length > 0 && (
        <div className="rounded-lg bg-danger-soft p-3 text-caption text-danger">
          {summary.errors.map((e, i) => (
            <p key={i}>
              {e.row}: {e.message}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
