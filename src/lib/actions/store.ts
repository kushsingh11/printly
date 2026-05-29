"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { saveOrderFile } from "@/lib/storage";
import * as sheets from "@/lib/sheets";

export type OrderActionState = { error?: string } | undefined;
export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

const cartSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50) }))
  .min(1)
  .max(50);

/** Student checkout: the Sheets API validates stock/price and creates the order. */
export async function createOrder(
  items: { productId: string; qty: number }[],
): Promise<CreateOrderResult> {
  const user = await requireRole("STUDENT");
  if (!user.email) return { ok: false, error: "Not signed in." };
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Your cart is empty or invalid." };

  try {
    const { id } = await sheets.createOrder({ studentEmail: user.email, items: parsed.data });
    return { ok: true, orderId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't place the order." };
  }
}

const RECEIPT_MAX = 10 * 1024 * 1024;
const RECEIPT_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/pdf": ".pdf",
};

export async function submitOrderReceipt(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const user = await requireRole("STUDENT");
  const orderId = String(formData.get("orderId") ?? "");
  const upiRef = String(formData.get("upiRef") ?? "").trim();
  const receipt = formData.get("receipt");

  const order = await sheets.getOrder(orderId);
  if (!order || order.studentEmail !== user.email) return { error: "Order not found." };
  if (order.paymentStatus !== "PENDING" && order.paymentStatus !== "REJECTED") {
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
  const receiptKey = await saveOrderFile(orderId, `receipt${ext}`, bytes);
  await sheets.submitOrderReceipt({ id: orderId, upiRef, receiptKey });

  redirect("/orders");
}

// ---- Shopkeeper order handling (verify decrements stock + notifies, server-side) ----
function orderId(formData: FormData): string {
  return String(formData.get("orderId") ?? "");
}

export async function verifyOrderPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  await sheets.verifyOrderPayment(orderId(formData));
  revalidatePath("/shop/orders");
  revalidatePath("/shop/inventory");
}

export async function rejectOrderPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  await sheets.rejectOrderPayment(orderId(formData));
  revalidatePath("/shop/orders");
}

export async function markOrderPickedUp(formData: FormData) {
  await requireRole("SHOPKEEPER");
  await sheets.markOrderPickedUp(orderId(formData));
  revalidatePath("/shop/orders");
}
