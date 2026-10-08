"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { addPersonalExpense } from "@/data/personal";
import { PERSONAL_EXPENSE_CATEGORIES, PERSONAL_EXPENSE_CATEGORY_LABELS } from "@/lib/format";
import { todayISO } from "@/lib/units";
import type { PersonalExpenseCategory } from "@/models";

export function AddPersonalExpenseModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<PersonalExpenseCategory>("GAS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await addPersonalExpense({ category, description, amount: Number(amount), date });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error ?? "Could not save");
  }

  return (
    <Modal
      title="Log expense"
      size="sm"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Field label="Category">
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as PersonalExpenseCategory)}>
          {PERSONAL_EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {PERSONAL_EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Description">
        <Input required value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (Rs)">
          <Input required type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
