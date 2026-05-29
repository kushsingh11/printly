"use server";

import { redirect } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { nextCode } from "@/lib/codes";
import { computePrintPrice } from "@/lib/pricing";
import { promoteTmpToJob, readTmp, saveJobFile } from "@/lib/storage";

export type PrintActionState = { error?: string } | undefined;

const createSchema = z.object({
  token: z.string().min(1),
  fileName: z.string().min(1).max(200),
  copies: z.coerce.number().int().min(1).max(100),
  color: z.enum(["BW", "COLOR"]),
  sided: z.enum(["SINGLE", "DOUBLE"]),
  paperSize: z.enum(["A4", "A3"]),
  binding: z.enum(["NONE", "STAPLE", "SPIRAL"]),
  coverPage: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  rush: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function createPrintJob(
  _prev: PrintActionState,
  formData: FormData,
): Promise<PrintActionState> {
  const user = await requireRole("STUDENT");

  const parsed = createSchema.safeParse({
    token: formData.get("token"),
    fileName: formData.get("fileName"),
    copies: formData.get("copies"),
    color: formData.get("color"),
    sided: formData.get("sided"),
    paperSize: formData.get("paperSize"),
    binding: formData.get("binding"),
    coverPage: formData.get("coverPage"),
    rush: formData.get("rush"),
  });
  if (!parsed.success) return { error: "Please complete all the print options." };
  const input = parsed.data;

  const settings = await prisma.pricingSettings.findUnique({ where: { id: 1 } });
  if (!settings) return { error: "Shop is not configured yet. Try again later." };
  if (!settings.acceptingJobs) {
    return { error: "The shop is not accepting new print jobs right now." };
  }

  // Re-derive page count from the actual file — never trust the client.
  const tmpBytes = await readTmp(input.token);
  if (!tmpBytes) {
    return { error: "Your upload expired. Please upload the document again." };
  }
  let pageCount: number;
  try {
    const doc = await PDFDocument.load(tmpBytes, { ignoreEncryption: true });
    pageCount = doc.getPageCount();
  } catch {
    return { error: "Couldn't read the PDF. Please upload it again." };
  }

  const opts = {
    pageCount,
    copies: input.copies,
    color: input.color,
    sided: input.sided,
    paperSize: input.paperSize,
    binding: input.binding,
    coverPage: input.coverPage,
    rush: input.rush,
  };
  const { total } = computePrintPrice(settings, opts);

  const code = await nextCode("print", "PR");

  const job = await prisma.printJob.create({
    data: {
      code,
      studentId: user.id,
      fileName: input.fileName.slice(0, 200),
      filePath: "", // set after we move the file into the job folder
      pageCount,
      copies: input.copies,
      color: input.color,
      sided: input.sided,
      paperSize: input.paperSize,
      binding: input.binding,
      coverPage: input.coverPage,
      rush: input.rush,
      amount: total,
      paymentStatus: "PENDING",
      status: "AWAITING_PAYMENT",
    },
  });

  const rel = await promoteTmpToJob(input.token, job.id, "document.pdf");
  await prisma.printJob.update({ where: { id: job.id }, data: { filePath: rel } });

  redirect(`/print/${job.id}/pay`);
}

const RECEIPT_MAX = 10 * 1024 * 1024;
const RECEIPT_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/pdf": ".pdf",
};

export async function submitReceipt(
  _prev: PrintActionState,
  formData: FormData,
): Promise<PrintActionState> {
  const user = await requireRole("STUDENT");

  const jobId = String(formData.get("jobId") ?? "");
  const upiRef = String(formData.get("upiRef") ?? "").trim();
  const receipt = formData.get("receipt");

  const job = await prisma.printJob.findUnique({ where: { id: jobId } });
  if (!job || job.studentId !== user.id) return { error: "Print job not found." };
  if (job.paymentStatus !== "PENDING" && job.paymentStatus !== "REJECTED") {
    redirect("/orders");
  }
  if (!upiRef) return { error: "Enter the UPI transaction / reference number." };
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Attach a screenshot or PDF of your payment receipt." };
  }
  if (receipt.size > RECEIPT_MAX) return { error: "Receipt too large (max 10 MB)." };
  const ext = RECEIPT_TYPES[receipt.type];
  if (!ext) return { error: "Receipt must be a PNG, JPG, or PDF." };

  const bytes = Buffer.from(await receipt.arrayBuffer());
  const rel = await saveJobFile(jobId, `receipt${ext}`, bytes);

  await prisma.printJob.update({
    where: { id: jobId },
    data: { paymentStatus: "SUBMITTED", upiRef, receiptPath: rel },
  });

  redirect("/orders");
}
