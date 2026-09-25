"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteExpense, useExpenses } from "@/data/money";
import { EXPENSE_CATEGORY_LABELS, formatCurrency, formatDate } from "@/lib/format";

/** Other spending logged in the period (gas, workers, subscriptions…), with a button to add more. */
export function ExpensesPanel({ from, to }: { from: string; to: string }) {
  const { data: expenses = [] } = useExpenses(from, to);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl text-ink">Other expenses</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus size={16} strokeWidth={2.4} /> Add
        </Button>
      </div>

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

      {adding && <AddExpenseModal onClose={() => setAdding(false)} />}
    </Card>
  );
}
