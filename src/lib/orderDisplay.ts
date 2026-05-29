import type { OrderStatus, PaymentStatus } from "@prisma/client";
import type { Tone } from "@/lib/printStatus";

export const orderShopBadge: Record<OrderStatus, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "amber" },
  PENDING: { label: "Preparing", tone: "blue" },
  READY: { label: "Ready for pickup", tone: "green" },
  PICKED_UP: { label: "Picked up", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};

/** Headline status a student sees for a store order. */
export function studentOrderStatus(
  payment: PaymentStatus,
  status: OrderStatus,
): { label: string; tone: Tone; needsPayment: boolean } {
  if (payment === "PENDING") return { label: "Payment due", tone: "amber", needsPayment: true };
  if (payment === "REJECTED")
    return { label: "Payment rejected — re-upload", tone: "red", needsPayment: true };
  if (payment === "SUBMITTED")
    return { label: "Verifying payment…", tone: "blue", needsPayment: false };

  const map: Record<OrderStatus, { label: string; tone: Tone }> = {
    AWAITING_PAYMENT: { label: "Verifying payment…", tone: "blue" },
    PENDING: { label: "Being prepared", tone: "blue" },
    READY: { label: "Ready for pickup", tone: "green" },
    PICKED_UP: { label: "Picked up", tone: "neutral" },
    CANCELLED: { label: "Cancelled", tone: "red" },
  };
  return { ...map[status], needsPayment: false };
}
