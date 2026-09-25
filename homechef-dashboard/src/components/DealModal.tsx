"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryField } from "@/components/CategoryField";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { createDeal, findOrCreateCategory, updateMenuItem, useCategories, useMenu } from "@/data/menu";
import type { MenuItem } from "@/models";

export interface EditableDeal {
  item: MenuItem;
  /** Quantity of each item inside the deal, keyed by menu item id. */
  components: Record<string, string>;
}

/** Create a deal, or edit an existing one: pick items from any category and how many of each. */
export function DealModal({ deal, onClose }: { deal?: EditableDeal; onClose: () => void }) {
  const { data: menu = [] } = useMenu();
  const { data: categories = [] } = useCategories();

  const [name, setName] = useState(deal?.item.name ?? "");
  const [description, setDescription] = useState(deal?.item.description ?? "");
  const [category, setCategory] = useState(deal?.item.category.name ?? "Deals");
  const [price, setPrice] = useState(deal ? String(deal.item.price) : "");
  const [cost, setCost] = useState(deal && !deal.item.costIsAuto ? String(deal.item.costPrice) : "");
  const [picked, setPicked] = useState<Record<string, string>>(deal?.components ?? {});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const groups = categories
    .map((c) => ({
      category: c,
      items: menu.filter((i) => !i.isDeal && i.categoryId === c.id && (!query || i.name.toLowerCase().includes(query))),
    }))
    .filter((g) => g.items.length > 0);

  function toggle(id: string) {
    setPicked((current) => {
      const next = { ...current };
      if (id in next) delete next[id];
      else next[id] = "1";
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (Object.keys(picked).length === 0) return setError("Pick at least one item for the deal");
    setSaving(true);

    const categoryId = await findOrCreateCategory(category, categories);
    if (!categoryId) {
      setSaving(false);
      return setError("Could not create that category");
    }
    const details = {
      name,
      description: description || null,
      price: Number(price),
      categoryId,
      components: Object.entries(picked).map(([menuItemId, quantity]) => ({ menuItemId, quantity: Number(quantity) || 1 })),
      ...(cost !== "" && !deal?.item.costIsAuto && { costPrice: Number(cost) }),
    };
    const result = deal ? await updateMenuItem(deal.item.id, details) : await createDeal(details);
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save the deal");
  }

  return (
    <Modal
      title={deal ? "Edit deal" : "Create menu deal"}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : deal ? "Save changes" : "Create deal"}
          </Button>
        </>
      }
    >
      <Field label="Deal name">
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Combo 1" />
      </Field>
      <Field label="Description (optional)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <CategoryField value={category} onChange={setCategory} categories={categories} />
        <Field label="Deal price (Rs)">
          <Input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>

      <Field label={`Items in this deal (${Object.keys(picked).length} selected) — pick from any category`} group>
        <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
        <div className="max-h-64 overflow-y-auto rounded-sm border border-line">
          {groups.map(({ category: group, items }) => (
            <div key={group.id}>
              <p className="sticky top-0 bg-sunken px-3 py-1 text-caption font-bold text-ink-muted">{group.name}</p>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-sunken/60">
                  <label className="flex flex-1 cursor-pointer items-center gap-3 text-base text-ink">
                    <input type="checkbox" checked={item.id in picked} onChange={() => toggle(item.id)} />
                    {item.name}
                  </label>
                  {item.id in picked && (
                    <Input
                      type="number"
                      min="1"
                      aria-label={`Quantity of ${item.name}`}
                      value={picked[item.id]}
                      onChange={(e) => setPicked((current) => ({ ...current, [item.id]: e.target.value }))}
                      className="w-20"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          {groups.length === 0 && <p className="p-3 text-base text-ink-muted">No items match.</p>}
        </div>
      </Field>

      {!deal?.item.costIsAuto && (
        <Field label="Cost (optional)" hint="If every item inside has a cost, the deal's cost is worked out automatically and this is ignored.">
          <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>
      )}
      <p className="text-caption text-ink-muted">Selling this deal takes stock from each item inside it — the deal has no stock of its own.</p>

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
