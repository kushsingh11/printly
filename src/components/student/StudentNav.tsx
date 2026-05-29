"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/student/cart";

const tabs = [
  { href: "/print", label: "Print" },
  { href: "/store", label: "Store" },
  { href: "/orders", label: "My orders" },
];

export function StudentNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
      <Link
        href="/store/cart"
        className={`-mb-px ml-auto flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
          pathname === "/store/cart"
            ? "border-brand-600 text-brand-700"
            : "border-transparent text-neutral-500 hover:text-neutral-800"
        }`}
      >
        Cart
        {count > 0 && (
          <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </Link>
    </nav>
  );
}
