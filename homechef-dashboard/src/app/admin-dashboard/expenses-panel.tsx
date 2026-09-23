"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/format";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export default function ExpensesPanel({ from, to }: { from: string; to: string }) {
  const key = `/api/expenses?from=${from}&to=${to}`;
  const { data: expenses = [] } = useSWR<Expense[]>(key, fetcher);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "OTHER" });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
      }),
    });
    if (res.ok) {
      await mutate(key);
      setForm({ description: "", amount: "", category: "OTHER" });
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    await mutate(key);
  }

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl text-ink">Other expenses</h2>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-1 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-3 space-y-2 rounded-lg bg-sunken p-3">
          <input
            required
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-sm border border-control px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <input
              required
              type="number"
              min="0"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-1/2 rounded-sm border border-control px-2 py-1.5 text-sm"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-1/2 rounded-sm border border-control px-2 py-1.5 text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-pill bg-brand py-1.5 text-sm font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save expense"}
          </button>
        </form>
      )}

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {expenses.length === 0 && <p className="text-sm text-ink-muted">No expenses logged in this period.</p>}
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="truncate text-ink-muted">{e.description}</p>
              <p className="text-xs text-ink-muted">
                {formatDate(e.date)} · {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-bold text-ink-muted">{formatCurrency(e.amount)}</span>
              <button onClick={() => handleDelete(e.id)} className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft">
                <Trash2 size={16} strokeWidth={2.4} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
