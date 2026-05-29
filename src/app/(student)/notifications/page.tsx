import Link from "next/link";
import type { NotificationType } from "@/lib/types";
import { listNotifications } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { MarkReadOnView } from "@/components/student/MarkReadOnView";

const ICON: Record<NotificationType, string> = {
  PAYMENT_VERIFIED: "✅",
  PAYMENT_REJECTED: "⚠️",
  PRINT_READY: "🎉",
  ORDER_READY: "🛍️",
  PRINT_PICKED_UP: "📦",
};

function when(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function NotificationsPage() {
  const user = await requireRole("STUDENT");
  const notifs = user.email ? await listNotifications(user.email) : [];
  const hasUnread = notifs.some((n) => !n.read);

  return (
    <div>
      <MarkReadOnView hasUnread={hasUnread} />
      <h1 className="mb-4 text-xl font-semibold">Notifications</h1>

      {notifs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No notifications yet. We&apos;ll tell you when a payment is confirmed or your print is ready.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => {
            const body = (
              <div className={`flex gap-3 rounded-xl border p-4 ${n.read ? "border-neutral-200 bg-white" : "border-brand-200 bg-brand-50"}`}>
                <span className="text-lg leading-none">{ICON[n.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-neutral-400">{when(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-500">{n.body}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.linkPath ? (
                  <Link href={n.linkPath} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
