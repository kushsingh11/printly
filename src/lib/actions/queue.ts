"use server";

import { revalidatePath } from "next/cache";
import type { PrintStatus } from "@/lib/types";
import { requireRole } from "@/lib/session";
import * as sheets from "@/lib/sheets";

export async function verifyPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  await sheets.verifyPrintPayment(String(formData.get("jobId") ?? ""));
  revalidatePath("/shop");
}

export async function rejectPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  await sheets.rejectPrintPayment(String(formData.get("jobId") ?? ""));
  revalidatePath("/shop");
}

export async function advanceJob(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = String(formData.get("jobId") ?? "");
  const to = String(formData.get("to") ?? "") as PrintStatus;
  await sheets.advancePrintJob(id, to);
  revalidatePath("/shop");
}
