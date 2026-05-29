import Link from "next/link";
import { queueData } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { VerifyPanel } from "@/components/shop/VerifyPanel";
import { KanbanBoard } from "@/components/shop/KanbanBoard";
import { QueueTable } from "@/components/shop/QueueTable";
import { AutoRefresh } from "@/components/shop/AutoRefresh";

export default async function PrintQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireRole("SHOPKEEPER");
  const { view } = await searchParams;
  const isTable = view === "table";

  const { toVerify, active, pickedUp, stats: s } = await queueData();

  const boardJobs = [...active, ...pickedUp];
  const stats = [
    { label: "In queue", value: String(s.queued) },
    { label: "Printing", value: String(s.printing) },
    { label: "Ready for pickup", value: String(s.ready) },
    { label: "Today", value: formatINR(s.todayRevenue) },
  ];

  return (
    <div className="p-6">
      <AutoRefresh seconds={12} />

      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Print queue</h1>
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
            Live · auto-refreshing
          </p>
        </div>
        <div className="flex rounded-lg border border-neutral-300 bg-white p-0.5 text-sm">
          <Link
            href="/shop"
            className={`rounded-md px-3 py-1 font-medium ${!isTable ? "bg-brand-600 text-white" : "text-neutral-600"}`}
          >
            Kanban
          </Link>
          <Link
            href="/shop?view=table"
            className={`rounded-md px-3 py-1 font-medium ${isTable ? "bg-brand-600 text-white" : "text-neutral-600"}`}
          >
            Table
          </Link>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      <VerifyPanel jobs={toVerify} />

      {isTable ? <QueueTable jobs={boardJobs} /> : <KanbanBoard jobs={boardJobs} />}
    </div>
  );
}
