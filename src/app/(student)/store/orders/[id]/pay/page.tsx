import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getOrder, getSettings } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { OrderReceiptUpload } from "@/components/student/OrderReceiptUpload";

export default async function OrderPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("STUDENT");

  const order = await getOrder(id);
  if (!order || order.studentEmail !== user.email) notFound();
  if (order.paymentStatus !== "PENDING" && order.paymentStatus !== "REJECTED") redirect("/orders");

  const settings = await getSettings();
  const upiId = settings?.upiId ?? "";
  const rupees = (order.total / 100).toFixed(2);

  let upiLink: string | null = null;
  let qrDataUrl: string | null = null;
  if (upiId) {
    upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      settings?.shopName ?? "Printly",
    )}&am=${rupees}&cu=INR&tn=${encodeURIComponent(order.code)}`;
    qrDataUrl = await QRCode.toDataURL(upiLink, { width: 240, margin: 1 });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pay for order {order.code}</h1>
        <p className="text-sm text-neutral-500">{order.items.length} item(s)</p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <ul className="mb-3 space-y-1.5 text-sm">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between text-neutral-600">
              <span>
                {it.name} × {it.qty}
              </span>
              <span>{formatINR(it.unitPrice * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center">
        {upiLink && qrDataUrl ? (
          <>
            <a
              href={upiLink}
              className="block w-full rounded-lg bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700"
            >
              Pay {formatINR(order.total)} with UPI
            </a>
            <p className="mt-2 text-xs text-neutral-400">
              Opens GPay / PhonePe / Paytm on your phone.
            </p>

            <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              or scan from another device
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <Image src={qrDataUrl} alt="UPI QR code" width={200} height={200} className="mx-auto rounded-lg border border-neutral-200" unoptimized />
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
        <OrderReceiptUpload orderId={order.id} />
      </div>
    </div>
  );
}
