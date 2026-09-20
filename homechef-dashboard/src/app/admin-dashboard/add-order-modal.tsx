"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { X, Plus, Trash2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatCurrency, STATUS_LABELS, STATUS_FLOW } from "@/lib/format";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: { name: string };
}

interface ItemRow {
  menuItemId: string;
  quantity: string;
  price: string;
}

function toLocalDateTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AddOrderModal({ onClose }: { onClose: () => void }) {
  const { data: menuItems = [] } = useSWR<MenuItem[]>("/api/menu", fetcher);

  const [channel, setChannel] = useState<"DIRECT" | "FOODPANDA">("DIRECT");
  const [status, setStatus] = useState("PENDING");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(() => toLocalDateTimeInput(new Date()));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([{ menuItemId: "", quantity: "1", price: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { menuItemId: "", quantity: "1", price: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function selectItem(index: number, menuItemId: string) {
    const item = menuItems.find((m) => m.id === menuItemId);
    updateRow(index, { menuItemId, price: item ? String(item.price) : "" });
  }

  const total = rows.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const price = Number(r.price) || 0;
    return sum + qty * price;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validRows = rows.filter((r) => r.menuItemId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
        channel,
        status,
        createdAt: new Date(date).toISOString(),
        items: validRows.map((r) => ({
          menuItemId: r.menuItemId,
          quantity: Number(r.quantity),
          price: r.price !== "" ? Number(r.price) : undefined,
        })),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add order");
      return;
    }

    await mutate((key) => typeof key === "string" && key.startsWith("/api/orders"));
    await mutate((key) => typeof key === "string" && key.startsWith("/api/analytics"));
    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-warm-beige/30 px-5 py-4">
          <h2 className="text-lg font-semibold text-charcoal">Add order</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal/40 hover:bg-cream">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex gap-2">
            {(["DIRECT", "FOODPANDA"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  channel === c ? "bg-terracotta text-white" : "bg-warm-beige/20 text-charcoal/60"
                }`}
              >
                {c === "FOODPANDA" ? "Foodpanda" : "Direct"}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-2 rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <input
              placeholder="Delivery address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-2 rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="col-span-2 rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
            >
              {[...STATUS_FLOW, "CANCELLED"].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={row.menuItemId}
                  onChange={(e) => selectItem(i, e.target.value)}
                  className="flex-1 rounded-lg border border-warm-beige/60 px-2 py-1.5 text-sm"
                >
                  <option value="">Select item…</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category.name})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, { quantity: e.target.value })}
                  className="w-16 rounded-lg border border-warm-beige/60 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: e.target.value })}
                  placeholder="Price"
                  className="w-20 rounded-lg border border-warm-beige/60 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="text-charcoal/25 hover:text-maroon disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-sm text-terracotta hover:underline"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-3 w-full rounded-lg border border-warm-beige/60 px-3 py-2 text-sm"
          />

          <div className="mt-4 flex items-center justify-between border-t border-warm-beige/30 pt-3">
            <span className="text-sm text-charcoal/60">Total</span>
            <span className="text-lg font-semibold text-charcoal">{formatCurrency(total)}</span>
          </div>

          {error && <p className="mt-2 text-sm text-maroon">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-charcoal/60 hover:bg-cream">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
