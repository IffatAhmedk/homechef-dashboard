"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryField } from "@/components/CategoryField";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { createMenuItem, findOrCreateCategory, useCategories } from "@/data/menu";

export function AddMenuItemModal({ onClose }: { onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const categoryId = await findOrCreateCategory(category, categories);
    if (!categoryId) {
      setSaving(false);
      return setError("Could not create that category");
    }
    const result = await createMenuItem({
      name,
      description: description || undefined,
      price: Number(price),
      costPrice: Number(cost || 0),
      stockQty: Number(stock || 0),
      categoryId,
    });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not add the item");
  }

  return (
    <Modal
      title="Create menu item"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add to menu"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <CategoryField value={category} onChange={setCategory} categories={categories} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Price (Rs)">
          <Input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Cost (Rs)" hint="Or add a recipe later.">
          <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        <Field label="Stock">
          <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
