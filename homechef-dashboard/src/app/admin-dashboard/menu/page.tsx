"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Plus, Trash2, Save, Printer, ChefHat, Upload, Pencil } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import RecipeModal from "./recipe-modal";
import MenuImportModal from "./import-modal";
import EditItemModal from "./edit-item-modal";
import { MenuProfitBars } from "@/components/ui";
import DateRangeFilter from "../date-range-filter";
import { useAnalytics } from "../range-context";
import DealModal from "./deal-modal";

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

export default function AdminMenuPage() {
  const { analytics, preset, customFrom, customTo, setPreset, setCustom } = useAnalytics();
  const { data: items = [] } = useSWR<MenuItem[]>("/api/menu", fetcher);
  const { data: categories = [] } = useSWR<Category[]>("/api/categories", fetcher);
  const [drafts, setDrafts] = useState<Record<string, { price: string; costPrice: string; stockQty: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showDeal, setShowDeal] = useState(false);

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
        ...(item.costIsAuto ? {} : { costPrice: Number(draft.costPrice) }),
        ...(item.isDeal ? {} : { stockQty: Number(draft.stockQty) }),
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
          <h1 className="font-heading text-3xl text-ink">Menu & Inventory</h1>
          <p className="text-sm text-ink-muted">Edit prices, stock, and availability. Changes go live immediately.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/print/menu"
            target="_blank"
            className="flex min-h-10 items-center gap-1.5 rounded-pill border border-control bg-card px-5 text-label font-bold text-ink hover:bg-sunken"
          >
            <Printer size={16} /> Print menu
          </Link>
          <button
            onClick={() => setShowImport(true)}
            className="flex min-h-10 items-center gap-1.5 rounded-pill border border-control bg-card px-5 text-label font-bold text-ink hover:bg-sunken"
          >
            <Upload size={16} /> Import CSV
          </button>
          <div className="group relative">
            <button
              aria-label="Create menu item or deal"
              aria-haspopup="menu"
              className="flex items-center justify-center rounded-pill bg-brand p-2 text-on-brand hover:opacity-90"
            >
              <Plus size={20} />
            </button>
            <div className="invisible absolute right-0 top-full z-20 pt-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div role="menu" className="w-44 overflow-hidden rounded-lg border border-control bg-card py-1 shadow-lg">
                <button
                  role="menuitem"
                  onClick={() => setShowAdd(true)}
                  className="block w-full px-3 py-2 text-left text-sm text-ink-muted hover:bg-sunken"
                >
                  Create menu item
                </button>
                <button
                  role="menuitem"
                  onClick={() => setShowDeal(true)}
                  className="block w-full px-3 py-2 text-left text-sm text-ink-muted hover:bg-sunken"
                >
                  Create menu deal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddItem} className="grid grid-cols-1 gap-3 rounded-lg border border-brand bg-sunken p-4 sm:grid-cols-6">
          <input
            required
            placeholder="Name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            placeholder="Description"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            list="category-options"
            placeholder="Category (new or existing)"
            value={newItem.categoryName}
            onChange={(e) => setNewItem({ ...newItem, categoryName: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
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
            className="rounded-sm border border-control px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Cost price"
            value={newItem.costPrice}
            onChange={(e) => setNewItem({ ...newItem, costPrice: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Stock qty"
            value={newItem.stockQty}
            onChange={(e) => setNewItem({ ...newItem, stockQty: e.target.value })}
            className="rounded-sm border border-control px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50 sm:col-span-6"
          >
            {adding ? "Adding…" : "Add to menu"}
          </button>
        </form>
      )}

      <section className="space-y-3 rounded-lg bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl text-ink">Profit by menu item</h2>
          <DateRangeFilter
            preset={preset}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={setPreset}
            onCustomChange={setCustom}
          />
        </div>
        <MenuProfitBars rows={analytics?.profitByItem ?? []} />
      </section>

      {grouped.map(({ category, items: catItems }) =>
        catItems.length === 0 ? null : (
          <div key={category.id} className="overflow-hidden rounded-lg border border-line bg-card">
            <div className="border-b border-line bg-sunken px-4 py-2 text-sm font-bold text-ink-muted">
              {category.name}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
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
                    <tr key={item.id} className={item.isAvailable ? "" : "bg-sunken opacity-60"}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink">
                          {item.name}
                          {item.isDeal && (
                            <span className="ml-2 rounded-pill bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                              Deal
                            </span>
                          )}
                        </p>
                        {item.description && <p className="text-xs text-ink-muted">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-ink-muted">Rs </span>
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [item.id]: { ...draft, price: e.target.value } }))
                            }
                            className="w-20 rounded border border-line px-2 py-1 text-sm"
                          />
                          <span className="ml-1 text-xs text-ink-muted">sell</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.costIsAuto ? (
                          <div className="flex items-center gap-1">
                            <span className="text-ink-muted">Rs {item.costPrice.toFixed(0)}</span>
                            <span className="text-xs text-ink-muted">auto</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-ink-muted">Rs </span>
                            <input
                              type="number"
                              value={draft.costPrice}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [item.id]: { ...draft, costPrice: e.target.value } }))
                              }
                              className="w-20 rounded border border-line px-2 py-1 text-sm"
                            />
                            <span className="ml-1 text-xs text-ink-muted">cost</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.isDeal ? (
                          <span className="text-ink-muted">
                            {item.availableQty}
                            <span className="ml-1 text-xs text-ink-muted">can make</span>
                          </span>
                        ) : (
                          <>
                            <input
                              type="number"
                              value={draft.stockQty}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [item.id]: { ...draft, stockQty: e.target.value } }))
                              }
                              className="w-20 rounded border border-line px-2 py-1 text-sm"
                            />
                            <span className="ml-1 text-xs text-ink-muted">in stock</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 text-xs text-ink-muted">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={() => toggleAvailability(item)}
                            className="h-4 w-4 accent-brand"
                          />
                          Available
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {dirty && (
                            <button
                              onClick={() => saveDraft(item)}
                              disabled={savingId === item.id}
                              className="flex items-center gap-1 rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
                            >
                              <Save size={16} strokeWidth={2.4} /> Save
                            </button>
                          )}
                          <button
                            onClick={() => setEditItem(item)}
                            className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-brand hover:bg-brand-soft"
                          >
                            <Pencil size={16} strokeWidth={2.4} /> Edit
                          </button>
                          <button
                            onClick={() => setRecipeItem(item)}
                            className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-brand hover:bg-brand-soft"
                          >
                            <ChefHat size={16} strokeWidth={2.4} /> Recipe
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft"
                          >
                            <Trash2 size={16} strokeWidth={2.4} /> Delete
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
      {items.length === 0 && <p className="text-sm text-ink-muted">No menu items yet.</p>}

      {recipeItem && (
        <RecipeModal
          menuItemId={recipeItem.id}
          menuItemName={recipeItem.name}
          onClose={() => setRecipeItem(null)}
        />
      )}
      {showDeal && <DealModal onClose={() => setShowDeal(false)} />}
      {showImport && <MenuImportModal onClose={() => setShowImport(false)} />}
      {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}
