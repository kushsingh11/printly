import type { PaymentStatus, PrintStatus } from "@prisma/client";

export type Tone = "neutral" | "blue" | "amber" | "green" | "red";

export const toneClass: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-600",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
};

/** What the student sees as the headline status of a print job. */
export function studentJobStatus(
  payment: PaymentStatus,
  status: PrintStatus,
): { label: string; tone: Tone; needsPayment: boolean } {
  if (payment === "PENDING") return { label: "Payment due", tone: "amber", needsPayment: true };
  if (payment === "REJECTED")
    return { label: "Payment rejected — re-upload", tone: "red", needsPayment: true };
  if (payment === "SUBMITTED")
    return { label: "Verifying payment…", tone: "blue", needsPayment: false };

  // payment verified -> reflect print progress
  const map: Record<PrintStatus, { label: string; tone: Tone }> = {
    AWAITING_PAYMENT: { label: "Verifying payment…", tone: "blue" },
    QUEUED: { label: "In queue", tone: "blue" },
    PRINTING: { label: "Printing", tone: "blue" },
    READY: { label: "Ready for pickup", tone: "green" },
    PICKED_UP: { label: "Picked up", tone: "neutral" },
    CANCELLED: { label: "Cancelled", tone: "red" },
  };
  return { ...map[status], needsPayment: false };
}
