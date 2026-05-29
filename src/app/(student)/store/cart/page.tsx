"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/student/cart";
import { createOrder } from "@/lib/actions/store";
import { formatINR } from "@/lib/money";

export default function CartPage() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setError(null);
    setPending(true);
    const res = await createOrder(items.map((i) => ({ productId: i.productId, qty: i.qty })));
    if (res.ok) {
      clear();
      router.push(`/store/orders/${res.orderId}/pay`);
    } else {
      setError(res.error);
      setPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold">Your cart</h1>
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Your cart is empty.{" "}
          <Link href="/store" className="font-medium text-brand-600 hover:underline">
            Browse the store
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Your cart</h1>

      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.productId} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.name}</p>
              <p className="text-xs text-neutral-400">{formatINR(i.price)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(i.productId, i.qty - 1)} className="h-7 w-7 rounded-lg border border-neutral-300 text-sm">
                −
              </button>
              <span className="w-6 text-center text-sm">{i.qty}</span>
              <button onClick={() => setQty(i.productId, i.qty + 1)} className="h-7 w-7 rounded-lg border border-neutral-300 text-sm">
                +
              </button>
            </div>
            <span className="w-16 text-right text-sm font-semibold">{formatINR(i.price * i.qty)}</span>
            <button onClick={() => remove(i.productId)} className="text-xs text-neutral-400 hover:text-red-600">
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <span className="text-sm text-neutral-500">Subtotal</span>
        <span className="text-lg font-semibold">{formatINR(subtotal)}</span>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={checkout}
        disabled={pending}
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Creating order…" : "Proceed to pay"}
      </button>
    </div>
  );
}
