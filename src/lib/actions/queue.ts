"use server";

import { revalidatePath } from "next/cache";
import type { PrintStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { notify } from "@/lib/notify";
import { formatINR } from "@/lib/money";

// Legal forward transitions for the print pipeline.
const NEXT: Partial<Record<PrintStatus, PrintStatus>> = {
  QUEUED: "PRINTING",
  PRINTING: "READY",
  READY: "PICKED_UP",
};

function jobId(formData: FormData): string {
  return String(formData.get("jobId") ?? "");
}

/** Shopkeeper confirms the UPI receipt → job enters the print queue. */
export async function verifyPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = jobId(formData);

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job || job.paymentStatus !== "SUBMITTED") return;

  await prisma.printJob.update({
    where: { id },
    data: { paymentStatus: "VERIFIED", status: "QUEUED", paidAt: new Date() },
  });
  await notify(
    job.studentId,
    "PAYMENT_VERIFIED",
    "Payment confirmed",
    `Your payment for ${job.code} (${formatINR(job.amount)}) is confirmed. It's now in the print queue.`,
    "/orders",
  );
  revalidatePath("/shop");
}

/** Shopkeeper rejects the receipt → student must re-pay. */
export async function rejectPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = jobId(formData);

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job || job.paymentStatus !== "SUBMITTED") return;

  await prisma.printJob.update({
    where: { id },
    data: { paymentStatus: "REJECTED" },
  });
  await notify(
    job.studentId,
    "PAYMENT_REJECTED",
    "Payment couldn't be verified",
    `We couldn't verify your payment for ${job.code}. Please check and upload the receipt again.`,
    `/print/${job.id}/pay`,
  );
  revalidatePath("/shop");
}

/** Advance a job to the next pipeline stage (Start → Ready → Picked up). */
export async function advanceJob(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = jobId(formData);
  const to = String(formData.get("to") ?? "") as PrintStatus;

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job || job.paymentStatus !== "VERIFIED") return;
  if (NEXT[job.status] !== to) return; // only legal forward moves

  await prisma.printJob.update({ where: { id }, data: { status: to } });

  if (to === "READY") {
    await notify(
      job.studentId,
      "PRINT_READY",
      "Your print is ready 🎉",
      `${job.code} (${job.fileName}) is printed and ready for pickup.`,
      "/orders",
    );
  } else if (to === "PICKED_UP") {
    await notify(
      job.studentId,
      "PRINT_PICKED_UP",
      "Picked up",
      `${job.code} was handed over. Thanks!`,
      "/orders",
    );
  }
  revalidatePath("/shop");
}
