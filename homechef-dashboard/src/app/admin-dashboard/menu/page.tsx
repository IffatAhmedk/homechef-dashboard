"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save, Printer, ChefHat, Upload } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import RecipeModal from "./recipe-modal";
import MenuImportModal from "./import-modal";

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
  stockQty: number;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
  _count: { recipeLines: number };
}

export default function AdminMenuPage() {
  const { data: items = [] } = useSWR<MenuItem[]>("/api/menu", fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);
  const [drafts, setDrafts] = useState<Record<string, { price: string; costPrice: string; stockQty: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null);
  const [showImport, setShowImport] = useState(false);

  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", costPrice: "", stockQty: "", categoryName: "" });
  const [adding, setAdding] = useState(false);

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    await mutate("/api/menu");
  }

  async function saveDraft(item: MenuItem) {
    const draft = drafts[item.id];
    setSavingId(item.id);
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: Number(draft.price),
        costPrice: Number(draft.costPrice),
        stockQty: Number(draft.stockQty),
      }),
    });
    await mutate("/api/menu");
    setSavingId(null);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`/api/menu/${id}`, { method: "DELETE" });
    await mutate("/api/menu");
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);

    const trimmedName = newItem.categoryName.trim();
    let category = categories.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (!category) {
      const catRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, sortOrder: categories.length }),
      });
      if (!catRes.ok) {
        setAdding(false);
        return;
      }
      category = await catRes.json();
      await mutate("/api/categories");
    }

    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name,
        description: newItem.description || undefined,
        price: Number(newItem.price),
        costPrice: Number(newItem.costPrice || 0),
        stockQty: Number(newItem.stockQty || 0),
        categoryId: category!.id,
      }),
    });
    if (res.ok) {
      await mutate("/api/menu");
      setNewItem({ name: "", description: "", price: "", costPrice: "", stockQty: "", categoryName: "" });
      setShowAdd(false);
    }
    setAdding(false);
  }

  const grouped = categories.map((c) => ({
    category: c,
    items: items.filter((i) => i.categoryId === c.id),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Menu & Inventory</h1>
          <p className="text-sm text-charcoal/50">Edit prices, stock, and availability. Changes go live immediately.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/print/menu"
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-warm-beige/60 bg-white px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-cream"
          >
            <Printer size={16} /> Print menu
          </Link>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-warm-beige/60 bg-white px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-cream"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add item
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddItem} className="grid grid-cols-1 gap-3 rounded-xl border border-terracotta/30 bg-warm-beige/20 p-4 sm:grid-cols-6">
          <input
            required
            placeholder="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            list="category-options"
            placeholder="Category (new or existing)"
            value={newItem.categoryName}
            onChange={(e) => setNewItem({ ...newItem, categoryName: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <input
            required
            type="number"
            min="0"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Cost price"
            value={newItem.costPrice}
            onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Stock qty"
            value={newItem.stockQty}
            onChange={(e) => setNewItem({ ...newItem, stockQty: e.target.value })}
            className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-terracotta px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:col-span-6"
          >
            {adding ? "Adding…" : "Add to menu"}
          </button>
        </form>
      )}

      {grouped.map(({ category, items: catItems }) =>
        catItems.length === 0 ? null : (
          <div key={category.id} className="overflow-hidden rounded-xl border border-warm-beige/40 bg-white">
            <div className="border-b border-warm-beige/30 bg-cream px-4 py-2 text-sm font-semibold text-charcoal/80">
              {category.name}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-warm-beige/20">
                {catItems.map((item) => {
                  const draft = drafts[item.id] ?? {
                    price: String(item.price),
                    costPrice: String(item.costPrice),
                    stockQty: String(item.stockQty),
                  };
                  const dirty =
                    draft.price !== String(item.price) ||
                    draft.costPrice !== String(item.costPrice) ||
                    draft.stockQty !== String(item.stockQty);
                  return (
                    <tr key={item.id} className={item.isAvailable ? "" : "bg-cream opacity-60"}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal">{item.name}</p>
                        {item.description && <p className="text-xs text-charcoal/50">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-charcoal/40">Rs </span>
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [item.id]: { ...draft, price: e.target.value } }))
                            }
                            className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-sm"
                          />
                          <span className="ml-1 text-xs text-charcoal/40">sell</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item._count.recipeLines > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-charcoal/70">Rs {item.costPrice.toFixed(0)}</span>
                            <span className="text-xs text-charcoal/40">from recipe</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-charcoal/40">Rs </span>
                            <input
                              type="number"
                              value={draft.costPrice}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [item.id]: { ...draft, costPrice: e.target.value } }))
                              }
                              className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-sm"
                            />
                            <span className="ml-1 text-xs text-charcoal/40">cost</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={draft.stockQty}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [item.id]: { ...draft, stockQty: e.target.value } }))
                          }
                          className="w-20 rounded border border-warm-beige/40 px-2 py-1 text-sm"
                        />
                        <span className="ml-1 text-xs text-charcoal/40">in stock</span>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 text-xs text-charcoal/60">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={() => toggleAvailability(item)}
                            className="h-4 w-4 accent-terracotta"
                          />
                          Available
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {dirty && (
                            <button
                              onClick={() => saveDraft(item)}
                              disabled={savingId === item.id}
                              className="flex items-center gap-1 rounded-lg bg-terracotta px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                            >
                              <Save size={12} /> Save
                            </button>
                          )}
                          <button
                            onClick={() => setRecipeItem(item)}
                            title="Edit recipe"
                            className="rounded-lg p-1.5 text-charcoal/40 hover:bg-terracotta/10 hover:text-terracotta"
                          >
                            <ChefHat size={14} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-1.5 text-charcoal/40 hover:bg-maroon/10 hover:text-maroon"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {items.length === 0 && <p className="text-sm text-charcoal/40">No menu items yet.</p>}

      {recipeItem && (
        <RecipeModal
          menuItemId={recipeItem.id}
          menuItemName={recipeItem.name}
          onClose={() => setRecipeItem(null)}
        />
      )}
      {showImport && <MenuImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
