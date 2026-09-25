"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { addExpense } from "@/data/money";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/format";

export function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await addExpense({ description, amount: Number(amount), category });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save the expense");
  }

  return (
    <Modal
      title="Add an expense"
      size="sm"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </>
      }
    >
      <Field label="What was it for?">
        <Input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (Rs)">
          <Input required type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Kind">
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
