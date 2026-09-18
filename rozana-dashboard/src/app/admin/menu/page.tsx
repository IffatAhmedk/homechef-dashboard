"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save } from "lucide-react";
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
  stockQty: number;
  isAvailable: boolean;
  categoryId: string;
  category: Category;
}

export default function AdminMenuPage() {
  const { data: items = [] } = useSWR<MenuItem[]>("/api/menu", fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);
  const [drafts, setDrafts] = useState<Record<string, { price: string; stockQty: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", stockQty: "", categoryId: "" });
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
      body: JSON.stringify({ price: Number(draft.price), stockQty: Number(draft.stockQty) }),
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
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItem.name,
        description: newItem.description || undefined,
        price: Number(newItem.price),
        stockQty: Number(newItem.stockQty || 0),
        categoryId: newItem.categoryId,
      }),
    });
    if (res.ok) {
      await mutate("/api/menu");
      setNewItem({ name: "", description: "", price: "", stockQty: "", categoryId: "" });
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
          <h1 className="text-xl font-semibold text-neutral-900">Menu & Inventory</h1>
          <p className="text-sm text-neutral-500">Edit prices, stock, and availability. Changes go live immediately.</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddItem} className="grid grid-cols-1 gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 sm:grid-cols-6">
          <input
            required
            placeholder="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            required
            value={newItem.categoryId}
            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            required
            type="number"
            min="0"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Stock qty"
            value={newItem.stockQty}
            onChange={(e) => setNewItem({ ...newItem, stockQty: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 sm:col-span-6"
          >
            {adding ? "Adding…" : "Add to menu"}
          </button>
        </form>
      )}

      {grouped.map(({ category, items: catItems }) =>
        catItems.length === 0 ? null : (
          <div key={category.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700">
              {category.name}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                {catItems.map((item) => {
                  const draft = drafts[item.id] ?? { price: String(item.price), stockQty: String(item.stockQty) };
                  const dirty = draft.price !== String(item.price) || draft.stockQty !== String(item.stockQty);
                  return (
                    <tr key={item.id} className={item.isAvailable ? "" : "bg-neutral-50 opacity-60"}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        {item.description && <p className="text-xs text-neutral-500">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-400">₹</span>
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [item.id]: { ...draft, price: e.target.value } }))
                            }
                            className="w-20 rounded border border-neutral-200 px-2 py-1 text-sm"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={draft.stockQty}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [item.id]: { ...draft, stockQty: e.target.value } }))
                          }
                          className="w-20 rounded border border-neutral-200 px-2 py-1 text-sm"
                        />
                        <span className="ml-1 text-xs text-neutral-400">in stock</span>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 text-xs text-neutral-600">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={() => toggleAvailability(item)}
                            className="h-4 w-4 accent-orange-600"
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
                              className="flex items-center gap-1 rounded-lg bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                            >
                              <Save size={12} /> Save
                            </button>
                          )}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
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
      {items.length === 0 && <p className="text-sm text-neutral-400">No menu items yet.</p>}
    </div>
  );
}
