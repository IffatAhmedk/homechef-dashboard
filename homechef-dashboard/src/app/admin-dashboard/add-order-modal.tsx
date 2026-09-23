"use client";

import { useEffect, useState } from "react";
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

interface CustomerMatch {
  id: string;
  name: string;
  phone: string;
  address: string | null;
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

export interface EditableOrder {
  id: string;
  status: string;
  createdAt: string;
  notes: string | null;
  deliveryAddress: string;
  discount?: number;
  deliveryCharge?: number;
  tip?: number;
  customer: { name: string; phone: string };
  items: { menuItemId: string; quantity: number; priceAtSale: number }[];
}

export default function AddOrderModal({ onClose, editOrder }: { onClose: () => void; editOrder?: EditableOrder }) {
  const { data: menuItems = [] } = useSWR<MenuItem[]>("/api/menu", fetcher);

  const isEdit = !!editOrder;
  const [channel, setChannel] = useState<"DIRECT" | "FOODPANDA">("DIRECT");
  const [status, setStatus] = useState(editOrder?.status ?? "PENDING");
  const [name, setName] = useState(editOrder?.customer.name ?? "");
  const [phone, setPhone] = useState(editOrder?.customer.phone.startsWith("manual-") ? "" : (editOrder?.customer.phone ?? ""));
  const [address, setAddress] = useState(editOrder?.deliveryAddress ?? "");
  const [date, setDate] = useState(() => toLocalDateTimeInput(editOrder ? new Date(editOrder.createdAt) : new Date()));
  const [notes, setNotes] = useState(editOrder?.notes ?? "");
  const [discount, setDiscount] = useState(editOrder?.discount ? String(editOrder.discount) : "");
  const [deliveryCharge, setDeliveryCharge] = useState(editOrder?.deliveryCharge ? String(editOrder.deliveryCharge) : "");
  const [tip, setTip] = useState(editOrder?.tip ? String(editOrder.tip) : "");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState<ItemRow[]>(
    editOrder
      ? editOrder.items.map((i) => ({ menuItemId: i.menuItemId, quantity: String(i.quantity), price: String(i.priceAtSale) }))
      : [{ menuItemId: "", quantity: "1", price: "" }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId || searchTerm.trim().length < 2) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/customers/lookup?q=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) setMatches(await res.json());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, customerId]);

  function typeCustomerField(field: "name" | "phone", value: string) {
    if (field === "name") setName(value);
    else setPhone(value);
    setCustomerId(null);
    setSearchTerm(value);
  }

  function pickCustomer(c: CustomerMatch) {
    setCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone);
    if (c.address) setAddress(c.address);
    setMatches([]);
  }

  const showMatches = !customerId && searchTerm.trim().length >= 2 && matches.length > 0;

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

  const subtotal = rows.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const price = Number(r.price) || 0;
    return sum + qty * price;
  }, 0);
  const discountAmount = (subtotal * Number(discount)) / 100 || 0;
  const deliveryChargeAmount = Number(deliveryCharge) || 0;
  const customerTip = Number(tip) || 0;
  const total = subtotal - discountAmount + deliveryChargeAmount + customerTip;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validRows = rows.filter((r) => r.menuItemId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Add at least one item");
      return;
    }

    setSubmitting(true);
    const res = await fetch(isEdit ? `/api/orders/${editOrder.id}` : "/api/orders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId ?? undefined,
        discount: discountAmount,
        deliveryCharge: deliveryChargeAmount,
        tip: customerTip,
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
    await mutate((key) => typeof key === "string" && key.startsWith("/api/customers"));
    await mutate("/api/menu");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-heading text-2xl text-ink">{isEdit ? "Edit order" : "Add order"}</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded-pill px-5 text-label font-bold text-ink hover:bg-sunken">
            <X size={18} strokeWidth={2.4} /> Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className={`mb-4 flex gap-2 ${isEdit ? "hidden" : ""}`}>
            {(["DIRECT", "FOODPANDA"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${channel === c ? "bg-brand text-on-brand" : "bg-sunken text-ink-muted"
                  }`}
              >
                {c === "FOODPANDA" ? "Foodpanda" : "Direct"}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="relative col-span-2">
              <input
                required
                placeholder="Customer name (type to find existing)"
                value={name}
                onChange={(e) => typeCustomerField("name", e.target.value)}
                className="w-full rounded-sm border border-control px-3 py-2 text-sm"
              />
              {showMatches && (
                <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-control bg-card shadow-lg">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-sunken"
                      >
                        <span className="font-bold text-ink">{c.name}</span>
                        <span className="ml-2 text-ink-muted">{c.phone || "no phone"}</span>
                        {c.address && <span className="block truncate text-xs text-ink-muted">{c.address}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              placeholder="Phone (type to find existing)"
              value={phone}
              onChange={(e) => typeCustomerField("phone", e.target.value)}
              className="rounded-sm border border-control px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-sm border border-control px-3 py-2 text-sm"
            />
            <input
              placeholder="Delivery address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-2 rounded-sm border border-control px-3 py-2 text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="col-span-2 rounded-sm border border-control px-3 py-2 text-sm"
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
                  className="flex-1 rounded-sm border border-control px-2 py-1.5 text-sm"
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
                  className="w-16 rounded-sm border border-control px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: e.target.value })}
                  placeholder="Price"
                  className="w-20 rounded-sm border border-control px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="flex items-center gap-1 rounded-pill px-3 text-label font-bold text-danger hover:bg-danger-soft disabled:opacity-30"
                >
                  <Trash2 size={16} strokeWidth={2.4} /> Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-sm text-brand hover:underline"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-3 w-full rounded-sm border border-control px-3 py-2 text-sm"
          />

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <label className="text-xs text-ink-muted">
              Flat discount
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-sm border border-control px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Delivery charges (DC)
              <input
                type="number"
                min="0"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-sm border border-control px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Tip
              <input
                type="number"
                min="0"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-sm border border-control px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-ink-muted">Total</span>
            <span className="text-lg font-bold text-ink">{formatCurrency(total)}</span>
          </div>

          {error && <p className="mt-2 text-sm text-danger">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-pill px-5 text-label text-ink-muted hover:bg-sunken">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-pill bg-brand px-5 text-label font-bold text-on-brand hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
