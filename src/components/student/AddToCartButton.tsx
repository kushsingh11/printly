"use client";

import { useState } from "react";
import { useCart } from "@/components/student/cart";

export function AddToCartButton({
  product,
  disabled,
}: {
  product: { productId: string; name: string; price: number };
  disabled?: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (disabled) {
    return (
      <button disabled className="w-full rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-400">
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        add(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className="w-full rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
