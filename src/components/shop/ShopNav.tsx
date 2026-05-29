"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/shop", label: "Print queue", exact: true },
  { href: "/shop/orders", label: "Shop orders" },
  { href: "/shop/inventory", label: "Inventory" },
  { href: "/shop/settings", label: "Print pricing" },
];

export function ShopNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
