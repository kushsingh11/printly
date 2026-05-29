import type { PrintJob, PrintStatus } from "@prisma/client";
import type { Tone } from "@/lib/printStatus";

type SpecsInput = Pick<
  PrintJob,
  "pageCount" | "copies" | "color" | "sided" | "paperSize" | "binding" | "coverPage" | "rush"
>;

/** "24p × 2 · B&W · Double · A3 · Spiral · Cover · Rush" */
export function formatSpecs(j: SpecsInput): string {
  const parts = [
    `${j.pageCount}p × ${j.copies}`,
    j.color === "BW" ? "B&W" : "Color",
    j.sided === "DOUBLE" ? "Double" : "Single",
  ];
  if (j.paperSize === "A3") parts.push("A3");
  if (j.binding === "STAPLE") parts.push("Staple");
  if (j.binding === "SPIRAL") parts.push("Spiral");
  if (j.coverPage) parts.push("Cover");
  if (j.rush) parts.push("Rush");
  return parts.join(" · ");
}

/** "10:42" style local time. */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export const shopStatusBadge: Record<PrintStatus, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "amber" },
  QUEUED: { label: "Queued", tone: "blue" },
  PRINTING: { label: "Printing", tone: "blue" },
  READY: { label: "Ready", tone: "green" },
  PICKED_UP: { label: "Picked up", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};
