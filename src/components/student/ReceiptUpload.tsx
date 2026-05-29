"use client";

import { useActionState } from "react";
import { submitReceipt, type PrintActionState } from "@/lib/actions/print";

export function ReceiptUpload({ jobId }: { jobId: string }) {
  const [state, formAction, isPending] = useActionState<PrintActionState, FormData>(
    submitReceipt,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          UPI reference / transaction ID
        </label>
        <input
          name="upiRef"
          required
          placeholder="e.g. 4123 5567 8899"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Payment receipt (screenshot or PDF)
        </label>
        <input
          type="file"
          name="receipt"
          accept="image/png,image/jpeg,application/pdf"
          required
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "I've paid — submit receipt"}
      </button>
    </form>
  );
}
