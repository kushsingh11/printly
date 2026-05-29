import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { verifyOrderPayment, rejectOrderPayment, markOrderPickedUp } from "@/lib/actions/store";
import { ShopActionForm } from "@/components/shop/ShopActionForm";
import { AutoRefresh } from "@/components/shop/AutoRefresh";

function itemsLine(items: { name: string; qty: number }[]): string {
  return items.map((i) => `${i.name} ×${i.qty}`).join(", ");
}

export default async function ShopOrdersPage() {
  await requireRole("SHOPKEEPER");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const withItemsAndStudent = { items: true, student: { select: { name: true } } } as const;

  const [toVerify, ready, pickedUp, todayAgg] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { paymentStatus: "SUBMITTED" },
      include: withItemsAndStudent,
      orderBy: { createdAt: "asc" },
    }),
    prisma.shopOrder.findMany({
      where: { status: "READY" },
      include: withItemsAndStudent,
      orderBy: { paidAt: "asc" },
    }),
    prisma.shopOrder.findMany({
      where: { status: "PICKED_UP" },
      include: withItemsAndStudent,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.shopOrder.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "VERIFIED", paidAt: { gte: startOfToday } },
    }),
  ]);

  const pendingValue = ready.reduce((s, o) => s + o.total, 0);

  return (
    <div className="p-6">
      <AutoRefresh seconds={15} />
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Shop orders</h1>
        <p className="text-sm text-neutral-500">Verify payments, then hand items over at the counter.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={String(toVerify.length)} label="To verify" />
        <Stat value={`${ready.length} · ${formatINR(pendingValue)}`} label="Pending pickups" />
        <Stat value={formatINR(todayAgg._sum.total ?? 0)} label="Sales today" />
      </div>

      {/* Verify */}
      {toVerify.length > 0 && (
        <section className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-brand-700">Payments to verify · {toVerify.length}</h2>
          <div className="space-y-2">
            {toVerify.map((o) => (
              <div key={o.id} className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="text-neutral-400">{o.code}</span> · {o.student.name}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{itemsLine(o.items)}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">ref {o.upiRef ?? "—"}</p>
                  <a href={`/api/orders/${o.id}/receipt`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline">
                    View receipt
                  </a>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className="mr-1 text-sm font-semibold">{formatINR(o.total)}</span>
                  <ShopActionForm action={verifyOrderPayment} id={o.id} idName="orderId" variant="success">
                    Verify
                  </ShopActionForm>
                  <ShopActionForm action={rejectOrderPayment} id={o.id} idName="orderId" variant="danger">
                    Reject
                  </ShopActionForm>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ready for pickup */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">Ready for pickup · {ready.length}</h2>
        {ready.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-400">
            Nothing waiting.
          </p>
        ) : (
          <div className="space-y-2">
            {ready.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="text-neutral-400">{o.code}</span> · {o.student.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">{itemsLine(o.items)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">{formatINR(o.total)}</span>
                  <ShopActionForm action={markOrderPickedUp} id={o.id} idName="orderId" variant="primary">
                    Mark picked up
                  </ShopActionForm>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent */}
      {pickedUp.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-600">Recently picked up</h2>
          <div className="space-y-1.5">
            {pickedUp.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm">
                <span className="text-neutral-500">
                  <span className="text-neutral-400">{o.code}</span> · {o.student.name}
                </span>
                <span className="text-neutral-400">{formatINR(o.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
