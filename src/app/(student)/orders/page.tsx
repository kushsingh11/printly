import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { studentJobStatus, toneClass } from "@/lib/printStatus";
import { studentOrderStatus } from "@/lib/orderDisplay";

export default async function OrdersPage() {
  const user = await requireRole("STUDENT");
  const [jobs, orders] = await Promise.all([
    prisma.printJob.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.shopOrder.findMany({
      where: { studentId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">My orders</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">Print jobs</h2>
        {jobs.length === 0 ? (
          <Empty>
            No print jobs.{" "}
            <Link href="/print/new" className="font-medium text-brand-600 hover:underline">
              Start one
            </Link>
            .
          </Empty>
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => {
              const st = studentJobStatus(j.paymentStatus, j.status);
              return (
                <li key={j.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        <span className="text-neutral-400">{j.code}</span> · {j.fileName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {j.pageCount}p × {j.copies} · {j.color === "BW" ? "B&W" : "Color"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatINR(j.amount)}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  </div>
                  {st.needsPayment && <PayLink href={`/print/${j.id}/pay`} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">Store orders</h2>
        {orders.length === 0 ? (
          <Empty>
            No store orders.{" "}
            <Link href="/store" className="font-medium text-brand-600 hover:underline">
              Visit the store
            </Link>
            .
          </Empty>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => {
              const st = studentOrderStatus(o.paymentStatus, o.status);
              return (
                <li key={o.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-neutral-400">{o.code}</span> ·{" "}
                        {o.items.length} item{o.items.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatINR(o.total)}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  </div>
                  {st.needsPayment && <PayLink href={`/store/orders/${o.id}/pay`} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
      {children}
    </p>
  );
}

function Badge({ tone, children }: { tone: keyof typeof toneClass; children: React.ReactNode }) {
  return (
    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClass[tone]}`}>
      {children}
    </span>
  );
}

function PayLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-block rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
    >
      Complete payment
    </Link>
  );
}
