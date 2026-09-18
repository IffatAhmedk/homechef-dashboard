"use client";

import { useCart } from "@/lib/cart-context";

export default function CartBadge() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-orange-700">
      {count}
    </span>
  );
}
