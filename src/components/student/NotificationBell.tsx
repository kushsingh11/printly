"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/notifications/unread")
        .then((r) => r.json())
        .then((d) => active && setCount(d.count ?? 0))
        .catch(() => {});
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <Link href="/notifications" className="relative rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
