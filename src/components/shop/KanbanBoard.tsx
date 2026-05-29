import type { PrintJob, PrintStatus } from "@prisma/client";
import { formatINR } from "@/lib/money";
import { formatSpecs, formatTime } from "@/lib/printDisplay";
import { advanceJob } from "@/lib/actions/queue";
import { ShopActionForm } from "@/components/shop/ShopActionForm";

type Job = PrintJob & { student: { name: string } };

const COLUMNS: { status: PrintStatus; title: string }[] = [
  { status: "QUEUED", title: "Queued" },
  { status: "PRINTING", title: "Printing" },
  { status: "READY", title: "Ready for pickup" },
  { status: "PICKED_UP", title: "Picked up" },
];

function CardAction({ job }: { job: Job }) {
  if (job.status === "QUEUED")
    return (
      <ShopActionForm action={advanceJob} id={job.id} to="PRINTING" variant="primary">
        Start printing
      </ShopActionForm>
    );
  if (job.status === "PRINTING")
    return (
      <ShopActionForm action={advanceJob} id={job.id} to="READY" variant="primary">
        Mark ready
      </ShopActionForm>
    );
  if (job.status === "READY")
    return (
      <ShopActionForm action={advanceJob} id={job.id} to="PICKED_UP" variant="success">
        Mark picked up
      </ShopActionForm>
    );
  return <span className="text-xs text-neutral-400">token #{job.code.replace(/\D/g, "")}</span>;
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{job.code}</span>
        <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-success">
          Paid
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium" title={job.fileName}>
        {job.fileName}
      </p>
      <p className="text-xs text-neutral-400">
        {job.student.name} · {formatTime(job.createdAt)}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{formatSpecs(job)}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{formatINR(job.amount)}</span>
        <a
          href={`/api/print/${job.id}/file`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-neutral-500 hover:underline"
        >
          Open PDF
        </a>
      </div>
      <div className="mt-2">
        <CardAction job={job} />
      </div>
    </div>
  );
}

export function KanbanBoard({ jobs }: { jobs: Job[] }) {
  const byStatus = (s: PrintStatus) => jobs.filter((j) => j.status === s);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = byStatus(col.status);
        return (
          <div key={col.status} className="rounded-2xl bg-neutral-100/70 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-neutral-700">{col.title}</h3>
              <span className="text-xs text-neutral-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="px-1 py-3 text-xs text-neutral-400">—</p>
              ) : (
                items.map((j) => <JobCard key={j.id} job={j} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
