"use client";

import { createContext, useContext, useSyncExternalStore, ReactNode } from "react";

export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

const STORAGE_KEY = "rozana-cart";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = [];

function readSnapshot(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedLines = raw ? JSON.parse(raw) : [];
    }
  } catch {
    // corrupted or unavailable storage; keep last known cache
  }
  return cachedLines;
}

function writeSnapshot(lines: CartLine[]) {
  cachedLines = lines;
  cachedRaw = JSON.stringify(lines);
  try {
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // storage unavailable, ignore
  }
  listeners.forEach((notify) => notify());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

const EMPTY_LINES: CartLine[] = [];

function getServerSnapshot(): CartLine[] {
  return EMPTY_LINES;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (item: Omit<CartLine, "quantity">) => void;
  removeItem: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const addItem: CartContextValue["addItem"] = (item) => {
    const existing = lines.find((l) => l.menuItemId === item.menuItemId);
    const next = existing
      ? lines.map((l) => (l.menuItemId === item.menuItemId ? { ...l, quantity: l.quantity + 1 } : l))
      : [...lines, { ...item, quantity: 1 }];
    writeSnapshot(next);
  };

  const removeItem = (menuItemId: string) => {
    writeSnapshot(lines.filter((l) => l.menuItemId !== menuItemId));
  };

  const setQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    writeSnapshot(lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l)));
  };

  const clear = () => writeSnapshot([]);

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, addItem, removeItem, setQuantity, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
