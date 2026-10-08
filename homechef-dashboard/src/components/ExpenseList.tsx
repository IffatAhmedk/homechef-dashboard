import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "@/data/money";
import { EXPENSE_CATEGORY_LABELS, formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/models";

/** The expense rows themselves — description, date, category, amount, and a way to delete one. */
export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {expenses.length === 0 && <p className="text-base text-ink-muted">No expenses logged in this period.</p>}
      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base text-ink">{expense.description}</p>
            <p className="text-caption text-ink-muted">
              {formatDate(expense.date)} · {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-base font-bold text-ink">{formatCurrency(expense.amount)}</span>
            <Button variant="destructive" size="sm" onClick={() => deleteExpense(expense.id)}>
              <Trash2 size={16} strokeWidth={2.4} /> Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
