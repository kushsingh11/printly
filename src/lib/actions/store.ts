"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { nextCode } from "@/lib/codes";
import { notify } from "@/lib/notify";
import { saveOrderFile } from "@/lib/storage";

export type OrderActionState = { error?: string } | undefined;

const cartSchema = z
  .array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50) }))
  .min(1)
  .max(50);

export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

/** Student checkout: validate cart server-side, create a ShopOrder awaiting payment. */
export async function createOrder(
  items: { productId: string; qty: number }[],
): Promise<CreateOrderResult> {
  const user = await requireRole("STUDENT");

  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "Your cart is empty or invalid." };

  // Collapse duplicate product ids.
  const qtyById = new Map<string, number>();
  for (const it of parsed.data) qtyById.set(it.productId, (qtyById.get(it.productId) ?? 0) + it.qty);

  const products = await prisma.product.findMany({
    where: { id: { in: [...qtyById.keys()], }, isVisible: true },
  });
  if (products.length === 0) return { ok: false, error: "These items are no longer available." };

  let total = 0;
  const orderItems: { productId: string; name: string; qty: number; unitPrice: number }[] = [];
  for (const p of products) {
    const qty = qtyById.get(p.id)!;
    if (p.stock < qty) {
      return { ok: false, error: `Only ${p.stock} left of "${p.name}".` };
    }
    total += p.price * qty;
    orderItems.push({ productId: p.id, name: p.name, qty, unitPrice: p.price });
  }

  const code = await nextCode("order", "SO");
  const order = await prisma.shopOrder.create({
    data: {
      code,
      studentId: user.id,
      total,
      paymentStatus: "PENDING",
      status: "AWAITING_PAYMENT",
      items: { create: orderItems },
    },
  });

  return { ok: true, orderId: order.id };
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

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.studentId !== user.id) return { error: "Order not found." };
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
  const rel = await saveOrderFile(orderId, `receipt${ext}`, bytes);

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { paymentStatus: "SUBMITTED", upiRef, receiptPath: rel },
  });

  redirect("/orders");
}

// ---- Shopkeeper order handling ----

function orderId(formData: FormData): string {
  return String(formData.get("orderId") ?? "");
}

/** Verify payment → decrement stock, mark ready for pickup, notify student. */
export async function verifyOrderPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = orderId(formData);

  const order = await prisma.shopOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.paymentStatus !== "SUBMITTED") return;

  await prisma.$transaction([
    prisma.shopOrder.update({
      where: { id },
      data: { paymentStatus: "VERIFIED", status: "READY", paidAt: new Date() },
    }),
    ...order.items.map((it) =>
      prisma.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.qty } },
      }),
    ),
  ]);

  await notify(
    order.studentId,
    "ORDER_READY",
    "Order ready for pickup 🛍️",
    `Your order ${order.code} is confirmed and ready to collect from the shop.`,
    "/orders",
  );
  revalidatePath("/shop/orders");
  revalidatePath("/shop/inventory");
}

export async function rejectOrderPayment(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = orderId(formData);

  const order = await prisma.shopOrder.findUnique({ where: { id } });
  if (!order || order.paymentStatus !== "SUBMITTED") return;

  await prisma.shopOrder.update({ where: { id }, data: { paymentStatus: "REJECTED" } });
  await notify(
    order.studentId,
    "PAYMENT_REJECTED",
    "Payment couldn't be verified",
    `We couldn't verify your payment for order ${order.code}. Please upload the receipt again.`,
    `/store/orders/${order.id}/pay`,
  );
  revalidatePath("/shop/orders");
}

export async function markOrderPickedUp(formData: FormData) {
  await requireRole("SHOPKEEPER");
  const id = orderId(formData);

  const order = await prisma.shopOrder.findUnique({ where: { id } });
  if (!order || order.status !== "READY") return;

  await prisma.shopOrder.update({ where: { id }, data: { status: "PICKED_UP" } });
  revalidatePath("/shop/orders");
}
