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
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Create menu deal</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Deal name (e.g. Combo 1)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-2 rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <input
              required
              list="deal-category-options"
              placeholder="Category"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
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
              className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-charcoal/50">
                Items in this deal ({pickedCount} selected) — pick from any category
              </p>
            </div>
            <input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-warm-beige/40">
              {groups.map(({ category, items: catItems }) => (
                <div key={category.id}>
                  <p className="sticky top-0 bg-cream px-3 py-1 text-xs font-semibold text-charcoal/60">{category.name}</p>
                  {catItems.map((item) => {
                    const on = item.id in picked;
                    return (
                      <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-cream/60">
                        <label className="flex flex-1 cursor-pointer items-center gap-2 text-charcoal/80">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(item.id)}
                            className="h-4 w-4 accent-terracotta"
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
                            className="w-16 rounded border border-warm-beige/60 px-2 py-1 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {groups.length === 0 && <p className="p-3 text-sm text-charcoal/40">No items match.</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal/50">Cost price (optional)</label>
            <input
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-charcoal/40">
              If every selected item has a cost, the deal&apos;s cost is calculated automatically and this is
              ignored. Only fill it in if some items don&apos;t have a cost yet.
            </p>
          </div>

          <p className="text-xs text-charcoal/40">
            Selling this deal takes stock from each item inside it — the deal has no stock of its own.
          </p>

          {error && <p className="text-sm text-maroon">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-warm-beige/30 pt-3">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-charcoal/60 hover:bg-cream">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
