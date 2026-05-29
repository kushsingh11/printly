import type { PrintJob, WithStudent } from "@/lib/types";
import { formatINR } from "@/lib/money";
import { formatSpecs, formatTime, shopStatusBadge } from "@/lib/printDisplay";
import { toneClass } from "@/lib/printStatus";
import { advanceJob } from "@/lib/actions/queue";
import { ShopActionForm } from "@/components/shop/ShopActionForm";

type Job = WithStudent<PrintJob>;

function RowAction({ job }: { job: Job }) {
  if (job.status === "QUEUED")
    return <ShopActionForm action={advanceJob} id={job.id} to="PRINTING" variant="primary">Start</ShopActionForm>;
  if (job.status === "PRINTING")
    return <ShopActionForm action={advanceJob} id={job.id} to="READY" variant="primary">Ready</ShopActionForm>;
  if (job.status === "READY")
    return <ShopActionForm action={advanceJob} id={job.id} to="PICKED_UP" variant="success">Picked up</ShopActionForm>;
  return <span className="text-xs text-neutral-400">—</span>;
}

export function QueueTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase text-neutral-400">
          <tr>
            <th className="px-4 py-2.5 font-medium">Job</th>
            <th className="px-4 py-2.5 font-medium">Student</th>
            <th className="px-4 py-2.5 font-medium">Specs</th>
            <th className="px-4 py-2.5 font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                No active jobs.
              </td>
            </tr>
          ) : (
            jobs.map((j) => {
              const badge = shopStatusBadge[j.status];
              return (
                <tr key={j.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <a href={`/api/print/${j.id}/file`} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                      {j.fileName}
                    </a>
                    <div className="text-xs text-neutral-400">
                      {j.code} · {formatTime(j.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{j.studentName}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{formatSpecs(j)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatINR(j.amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${toneClass[badge.tone]}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <RowAction job={j} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
