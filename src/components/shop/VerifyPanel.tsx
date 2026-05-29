import type { PrintJob, WithStudent } from "@/lib/types";
import { formatINR } from "@/lib/money";
import { formatSpecs } from "@/lib/printDisplay";
import { verifyPayment, rejectPayment } from "@/lib/actions/queue";
import { ShopActionForm } from "@/components/shop/ShopActionForm";

type Job = WithStudent<PrintJob>;

export function VerifyPanel({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-brand-700">
        Payments to verify · {jobs.length}
      </h2>
      <div className="space-y-2">
        {jobs.map((j) => (
          <div
            key={j.id}
            className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="text-neutral-400">{j.code}</span> · {j.fileName}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {j.studentName} · {formatSpecs(j)} · ref {j.upiRef ?? "—"}
              </p>
              <div className="mt-1 flex gap-3 text-xs">
                <a href={`/api/print/${j.id}/receipt`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
                  View receipt
                </a>
                <a href={`/api/print/${j.id}/file`} target="_blank" rel="noreferrer" className="font-medium text-neutral-500 hover:underline">
                  View document
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              <span className="mr-1 text-sm font-semibold">{formatINR(j.amount)}</span>
              <ShopActionForm action={verifyPayment} id={j.id} variant="success">
                Verify
              </ShopActionForm>
              <ShopActionForm action={rejectPayment} id={j.id} variant="danger">
                Reject
              </ShopActionForm>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
