"use client";

import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/format";

interface Props {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  stockQty: number;
}

export default function MenuItemCard({ id, name, description, price, isAvailable, stockQty }: Props) {
  const { addItem, lines } = useCart();
  const inCart = lines.find((l) => l.menuItemId === id)?.quantity ?? 0;
  const soldOut = !isAvailable || stockQty <= 0;
  const canAddMore = !soldOut && inCart < stockQty;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-neutral-900">{name}</h3>
          <span className="whitespace-nowrap font-semibold text-orange-700">{formatCurrency(price)}</span>
        </div>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      <div className="mt-3">
        {soldOut ? (
          <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
            Sold out
          </span>
        ) : (
          <button
            onClick={() => addItem({ menuItemId: id, name, price })}
            disabled={!canAddMore}
            className="w-full rounded-lg bg-orange-600 py-1.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {inCart > 0 ? `Add another (${inCart} in cart)` : "Add to cart"}
          </button>
        )}
      </div>
    </div>
  );
}
