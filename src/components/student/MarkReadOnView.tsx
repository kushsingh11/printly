"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/actions/notifications";

/** Marks all notifications read once when the feed is opened. */
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (hasUnread && !done.current) {
      done.current = true;
      markAllRead().then(() => router.refresh());
    }
  }, [hasUnread, router]);
  return null;
}
