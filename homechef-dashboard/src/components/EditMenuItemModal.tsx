"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryField } from "@/components/CategoryField";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { findOrCreateCategory, updateMenuItem, useCategories } from "@/data/menu";
import type { MenuItem } from "@/models";

/** Change a normal menu item's details. (Deals have their own window.) */
export function EditMenuItemModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { data: categories = [] } = useCategories();
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState(item.category.name);
  const [price, setPrice] = useState(String(item.price));
  const [cost, setCost] = useState(String(item.costPrice));
  const [stock, setStock] = useState(String(item.stockQty));
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
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
    const result = await updateMenuItem(item.id, {
      name,
      description: description || null,
      categoryId,
      price: Number(price),
      ...(item.costIsAuto ? {} : { costPrice: Number(cost) }),
      stockQty: Number(stock),
      isAvailable,
    });
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save the changes");
  }

  return (
    <Modal
      title="Edit item"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <CategoryField value={category} onChange={setCategory} categories={categories} />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Price (Rs)">
          <Input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Cost (Rs)" hint={item.costIsAuto ? "Worked out from the recipe." : undefined}>
          {item.costIsAuto ? (
            <div className="flex h-10 items-center rounded-sm bg-sunken px-3.5 text-base text-ink-muted">Rs {item.costPrice.toFixed(0)} (auto)</div>
          ) : (
            <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          )}
        </Field>
        <Field label="Stock">
          <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-3 text-base text-ink">
        <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
        Available
      </label>

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
