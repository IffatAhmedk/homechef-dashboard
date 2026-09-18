"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/format";

export default function CheckoutPage() {
  const { lines, setQuantity, removeItem, total, clear } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          notes,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to place order");
      clear();
      router.push(`/order/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/" className="mt-3 inline-block text-orange-700 underline">
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section>
        <h1 className="mb-4 text-xl font-semibold text-neutral-900">Your order</h1>
        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.menuItemId} className="flex items-center justify-between rounded-lg border border-orange-100 bg-white p-3">
              <div>
                <p className="font-medium text-neutral-900">{line.name}</p>
                <p className="text-sm text-neutral-500">{formatCurrency(line.price)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(line.menuItemId, line.quantity - 1)}
                  className="h-7 w-7 rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                >
                  −
                </button>
                <span className="w-5 text-center">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.menuItemId, line.quantity + 1)}
                  className="h-7 w-7 rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(line.menuItemId)}
                  className="ml-2 text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-orange-100 pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Delivery details</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Phone</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              title="Enter a 10-digit phone number"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Delivery address</label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              rows={3}
              placeholder="Flat / street / area / city"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="Less spicy, no onion, etc."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-orange-600 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Placing order…" : `Place order — ${formatCurrency(total)}`}
          </button>
        </form>
      </section>
    </div>
  );
}
