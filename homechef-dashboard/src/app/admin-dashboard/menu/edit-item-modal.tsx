"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number;
  costIsAuto: boolean;
  isDeal: boolean;
  availableQty: number;
  batchYield: number;
  stockQty: number;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
  _count: { recipeLines: number };
}

export default function EditItemModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [categoryName, setCategoryName] = useState(item.category.name);
  const [price, setPrice] = useState(String(item.price));
  const [costPrice, setCostPrice] = useState(String(item.costPrice));
  const [batchYield, setBatchYield] = useState(String(item.batchYield));
  const [stockQty, setStockQty] = useState(String(item.stockQty));
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRecipe = item._count.recipeLines > 0;
  const costIsAuto = item.costIsAuto;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const trimmedName = categoryName.trim();
    let category = categories.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (!category) {
      const catRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, sortOrder: categories.length }),
      });
      if (!catRes.ok) {
        setError("Failed to create category");
        setSaving(false);
        return;
      }
      category = await catRes.json();
      await mutate("/api/categories");
    }

    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        categoryId: category!.id,
        price: Number(price),
        ...(hasRecipe ? { batchYield: Number(batchYield) || 1 } : {}),
        ...(costIsAuto ? {} : { costPrice: Number(costPrice) }),
        ...(item.isDeal ? {} : { stockQty: Number(stockQty) }),
        isAvailable,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save changes");
      return;
    }

    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Edit item</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal/50">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal/50">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal/50">Category</label>
            <input
              required
              list="edit-category-options"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <datalist id="edit-category-options">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-charcoal/50">Price</label>
              <input
                required
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-charcoal/50">Cost price</label>
              {costIsAuto ? (
                <div className="flex items-center rounded-lg border border-warm-beige/40 bg-cream px-3 py-2 text-sm text-charcoal/50">
                  Rs {item.costPrice.toFixed(0)} (auto-calculated)
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>

          {hasRecipe && !item.isDeal && (
            <div>
              <label className="mb-1 block text-xs font-medium text-charcoal/50">Batch yield (servings)</label>
              <input
                type="number"
                min="1"
                value={batchYield}
                onChange={(e) => setBatchYield(e.target.value)}
                className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-charcoal/40">
                If the recipe&apos;s ingredient quantities are for a whole batch (e.g. a dough that makes 20
                parathas), set this to how many servings that batch yields. Leave at 1 if quantities are already
                per serving.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal/50">Stock quantity</label>
            {item.isDeal ? (
              <div className="rounded-lg border border-warm-beige/40 bg-cream px-3 py-2 text-sm text-charcoal/50">
                {item.availableQty} can be made from the items in this deal
              </div>
            ) : (
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-charcoal/70">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="h-4 w-4 accent-terracotta"
            />
            Available
          </label>

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
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
