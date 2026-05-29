import Link from "next/link";
import { unreadCount } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { StudentNav } from "@/components/student/StudentNav";
import { CartProvider } from "@/components/student/cart";
import { NotificationBell } from "@/components/student/NotificationBell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("STUDENT");
  const unread = user.email ? await unreadCount(user.email) : 0;

  return (
    <CartProvider>
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/print" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              P
            </span>
            <span className="font-semibold">Printly</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell initialCount={unread} />
            <span className="hidden text-sm text-neutral-500 sm:inline">{user.name}</span>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4">
          <StudentNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
    </CartProvider>
  );
}
