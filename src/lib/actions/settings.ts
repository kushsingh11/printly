"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { toPaise } from "@/lib/money";

export type SettingsActionState = { ok?: true; error?: string } | undefined;

const rupee = z.coerce.number().min(0);
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const schema = z.object({
  bwPerPage: rupee,
  colorPerPage: rupee,
  doubleSidedSurcharge: rupee,
  a3Surcharge: rupee,
  stapleFee: rupee,
  spiralFee: rupee,
  coverPageFee: rupee,
  rushPercent: z.coerce.number().int().min(0).max(200),
  freeSpiralAbove: rupee,
  acceptingJobs: bool,
  allowCashOnCollection: bool,
  autoEmailWhenReady: bool,
  upiId: z.string().trim().max(100).optional(),
  shopName: z.string().trim().min(1, "Shop name is required.").max(60),
  shopLocation: z.string().trim().max(60).optional(),
});

export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireRole("SHOPKEEPER");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the values." };
  const d = parsed.data;

  await prisma.pricingSettings.update({
    where: { id: 1 },
    data: {
      bwPerPage: toPaise(d.bwPerPage),
      colorPerPage: toPaise(d.colorPerPage),
      doubleSidedSurcharge: toPaise(d.doubleSidedSurcharge),
      a3Surcharge: toPaise(d.a3Surcharge),
      stapleFee: toPaise(d.stapleFee),
      spiralFee: toPaise(d.spiralFee),
      coverPageFee: toPaise(d.coverPageFee),
      rushPercent: d.rushPercent,
      freeSpiralAbove: toPaise(d.freeSpiralAbove),
      acceptingJobs: d.acceptingJobs,
      allowCashOnCollection: d.allowCashOnCollection,
      autoEmailWhenReady: d.autoEmailWhenReady,
      upiId: d.upiId || null,
      shopName: d.shopName,
      shopLocation: d.shopLocation || "Campus",
    },
  });

  revalidatePath("/shop/settings");
  revalidatePath("/print/new");
  return { ok: true };
}
