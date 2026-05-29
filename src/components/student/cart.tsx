"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

export type CartItem = { productId: string; name: string; price: number; qty: number };

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "printly.cart";
const CHANGE_EVENT = "printly:cart-change";
const EMPTY: CartItem[] = [];

// --- localStorage-backed external store (hydration-safe via useSyncExternalStore) ---

function read(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(next: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Cache keeps the snapshot referentially stable while the raw string is unchanged.
let snapshot: { raw: string; value: CartItem[] } = { raw: "[]", value: EMPTY };
function getSnapshot(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw !== snapshot.raw) {
    let value: CartItem[];
    try {
      value = JSON.parse(raw);
    } catch {
      value = EMPTY;
    }
    snapshot = { raw, value };
  }
  return snapshot.value;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
      add: (item, qty = 1) => {
        const cur = read();
        const ex = cur.find((p) => p.productId === item.productId);
        write(
          ex
            ? cur.map((p) => (p.productId === item.productId ? { ...p, qty: p.qty + qty } : p))
            : [...cur, { ...item, qty }],
        );
      },
      setQty: (productId, qty) => {
        const cur = read();
        write(
          qty <= 0
            ? cur.filter((p) => p.productId !== productId)
            : cur.map((p) => (p.productId === productId ? { ...p, qty } : p)),
        );
      },
      remove: (productId) => write(read().filter((p) => p.productId !== productId)),
      clear: () => write([]),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
