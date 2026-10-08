"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AddPersonalExpenseModal } from "@/components/AddPersonalExpenseModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/CategoryPieChart";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateRange } from "@/data/analytics";
import { deletePersonalExpense, usePersonalExpenses } from "@/data/personal";
import { formatCurrency, formatDate, PERSONAL_EXPENSE_CATEGORY_LABELS } from "@/lib/format";

export default function PersonalExpensesPage() {
  const { fromISO, toISO } = useDateRange();
  const { data: expenses = [] } = usePersonalExpenses(fromISO, toISO);
  const [adding, setAdding] = useState(false);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return [...totals.entries()].map(([category, value]) => ({ name: PERSONAL_EXPENSE_CATEGORY_LABELS[category] ?? category, value }));
  }, [expenses]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal expenses"
        actions={
          <>
            <DateRangeFilter />
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} strokeWidth={2.4} /> Log expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-heading text-lg text-ink">By category</h2>
          <CategoryPieChart data={byCategory} />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-ink">All entries</h2>
            <span className="text-base font-bold text-ink">{formatCurrency(total)}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-ink-muted">{PERSONAL_EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</TableCell>
                  <TableCell className="font-bold text-ink">{e.description}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-ink-muted">{formatDate(e.date)}</TableCell>
                  <TableCell>
                    <Button variant="destructive" size="sm" onClick={() => deletePersonalExpense(e.id)}>
                      <Trash2 size={16} strokeWidth={2.4} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {expenses.length === 0 && <p className="p-6 text-center text-base text-ink-muted">Nothing logged in this period.</p>}
        </Card>
      </div>

      {adding && <AddPersonalExpenseModal onClose={() => setAdding(false)} />}
    </div>
  );
}
