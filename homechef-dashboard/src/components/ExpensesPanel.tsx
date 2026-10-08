"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpenseList } from "@/components/ExpenseList";
import { useExpenses } from "@/data/money";

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
      <ExpenseList expenses={expenses} />
      {adding && <AddExpenseModal onClose={() => setAdding(false)} />}
    </Card>
  );
}
