"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { addRationItem } from "@/data/personal";
import { todayISO } from "@/lib/units";

export function AddRationItemModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await addRationItem({ name, amount: Number(amount), date });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error ?? "Could not save");
  }

  return (
    <Modal
      title="Add ration item"
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
      <Field label="Item">
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rice, 10 kg" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (Rs)">
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
