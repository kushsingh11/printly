import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getPrintJob, getSettings } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { ReceiptUpload } from "@/components/student/ReceiptUpload";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("STUDENT");

  const job = await getPrintJob(id);
  if (!job || job.studentEmail !== user.email) notFound();
  // Allow paying when due, or re-uploading after a rejection.
  if (job.paymentStatus !== "PENDING" && job.paymentStatus !== "REJECTED") redirect("/orders");

  const settings = await getSettings();
  const upiId = settings?.upiId ?? "";
  const rupees = (job.amount / 100).toFixed(2);

  let upiLink: string | null = null;
  let qrDataUrl: string | null = null;
  if (upiId) {
    upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      settings?.shopName ?? "Printly",
    )}&am=${rupees}&cu=INR&tn=${encodeURIComponent(job.code)}`;
    qrDataUrl = await QRCode.toDataURL(upiLink, { width: 240, margin: 1 });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pay for {job.code}</h1>
        <p className="text-sm text-neutral-500">{job.fileName}</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
        <p className="text-sm text-neutral-500">Amount to pay</p>
        <p className="mb-4 text-3xl font-semibold">{formatINR(job.amount)}</p>

        {upiLink && qrDataUrl ? (
          <>
            <a
              href={upiLink}
              className="block w-full rounded-lg bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700"
            >
              Pay {formatINR(job.amount)} with UPI
            </a>
            <p className="mt-2 text-xs text-neutral-400">
              Opens GPay / PhonePe / Paytm on your phone.
            </p>

            <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              or scan from another device
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <Image
              src={qrDataUrl}
              alt="UPI QR code"
              width={200}
              height={200}
              className="mx-auto rounded-lg border border-neutral-200"
              unoptimized
            />
            <p className="mt-3 text-sm">
              Pay to <span className="font-medium">{upiId}</span>
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            The shop hasn&apos;t set up a UPI ID yet. Please pay at the counter.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-neutral-600">Confirm your payment</h2>
        <p className="mb-3 text-xs text-neutral-500">
          After paying, enter the reference and upload your receipt. The shop will verify it and
          start printing — you&apos;ll be notified when it&apos;s ready.
        </p>
        <ReceiptUpload jobId={job.id} />
      </div>
    </div>
  );
}
