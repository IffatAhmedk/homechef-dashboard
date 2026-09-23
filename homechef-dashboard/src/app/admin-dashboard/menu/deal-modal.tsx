"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface Category {
  id: string;
  name: string;
}

interface BaseItem {
  id: string;
  name: string;
  isDeal: boolean;
  categoryId: string;
  category: Category;
}

export default function DealModal({ onClose }: { onClose: () => void }) {
  const { data: items = [] } = useSWR<BaseItem[]>("/api/menu", fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryName, setCategoryName] = useState("Deals");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectable = items.filter((i) => !i.isDeal);
  const query = search.trim().toLowerCase();
  const visible = selectable.filter((i) => !query || i.name.toLowerCase().includes(query));
  const groups = categories
    .map((c) => ({ category: c, items: visible.filter((i) => i.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);
  const pickedCount = Object.keys(picked).length;

  function toggle(id: string) {
    setPicked((p) => {
      const next = { ...p };
      if (id in next) delete next[id];
      else next[id] = "1";
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pickedCount === 0) {
      setError("Pick at least one item for the deal");
      return;
    }
    setSaving(true);

    const trimmed = categoryName.trim();
    let category = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (!category) {
      const catRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, sortOrder: categories.length }),
      });
      if (!catRes.ok) {
        setError("Failed to create category");
        setSaving(false);
        return;
      }
      category = await catRes.json();
      await mutate("/api/categories");
    }

    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        price: Number(price),
        costPrice: costPrice !== "" ? Number(costPrice) : undefined,
        categoryId: category!.id,
        isDeal: true,
        components: Object.entries(picked).map(([menuItemId, quantity]) => ({
          menuItemId,
          quantity: Number(quantity) || 1,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to create deal");
      return;
    }
    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">Create menu deal</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Deal name (e.g. Combo 1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 rounded-sm border border-control px-3 py-2 text-sm"
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-2 rounded-sm border border-control px-3 py-2 text-sm"
            />
            <input
              required
              list="deal-category-options"
              placeholder="Category"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="rounded-sm border border-control px-3 py-2 text-sm"
            />
            <datalist id="deal-category-options">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <input
              required
              type="number"
              min="0"
              placeholder="Deal price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-sm border border-control px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-bold text-ink-muted">
                Items in this deal ({pickedCount} selected) — pick from any category
              </p>
            </div>
            <input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 w-full rounded-sm border border-control px-3 py-2 text-sm"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-line">
              {groups.map(({ category, items: catItems }) => (
                <div key={category.id}>
                  <p className="sticky top-0 bg-sunken px-3 py-1 text-xs font-bold text-ink-muted">{category.name}</p>
                  {catItems.map((item) => {
                    const on = item.id in picked;
                    return (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-sunken/60">
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-ink-muted">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(item.id)}
                            className="h-4 w-4 accent-brand"
                          />
                          {item.name}
                        </label>
                        {on && (
                          <input
                            type="number"
                            min="1"
                            aria-label={`Quantity of ${item.name}`}
                            value={picked[item.id]}
                            onChange={(e) => setPicked((p) => ({ ...p, [item.id]: e.target.value }))}
                            className="w-16 rounded border border-control px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {groups.length === 0 && <p className="p-3 text-sm text-ink-muted">No items match.</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted">Cost price (optional)</label>
            <input
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full rounded-sm border border-control px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-ink-muted">
              If every selected item has a cost, the deal&apos;s cost is calculated automatically and this is
              ignored. Only fill it in if some items don&apos;t have a cost yet.
            </p>
          </div>

          <p className="text-xs text-ink-muted">
            Selling this deal takes stock from each item inside it — the deal has no stock of its own.
          </p>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={onClose} className="rounded-pill px-5 text-label text-ink-muted hover:bg-sunken">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
