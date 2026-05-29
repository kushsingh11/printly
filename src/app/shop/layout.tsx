import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ShopNav } from "@/components/shop/ShopNav";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SHOPKEEPER");
  const settings = await prisma.pricingSettings.findUnique({ where: { id: 1 } });

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            P
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{settings?.shopName ?? "Printly"}</p>
            <p className="text-xs text-neutral-400">Shopkeeper</p>
          </div>
        </div>

        <ShopNav />

        <div className="mt-auto border-t border-neutral-200 pt-3">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="mb-2 text-xs text-neutral-400">
            {settings?.shopLocation ?? "Campus"} · open
          </p>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-neutral-50">{children}</main>
    </div>
  );
}
