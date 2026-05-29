import Link from "next/link";
import { listPrintJobsByStudent } from "@/lib/sheets";
import { requireRole } from "@/lib/session";

export default async function StudentPrintPage() {
  const user = await requireRole("STUDENT");
  const jobs = (user.email ? await listPrintJobsByStudent(user.email) : []).slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Get something printed</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload a PDF, pick your options, pay by UPI, and collect when it&apos;s ready.
        </p>
        <Link
          href="/print/new"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          New print job
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">Your recent jobs</h2>
        {jobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No print jobs yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
                <span className="font-medium">{j.code}</span> · {j.fileName} · {j.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
