"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { toPaise } from "@/lib/money";
import { saveProductImage } from "@/lib/storage";
import * as sheets from "@/lib/sheets";

export type ProductActionState = { error?: string } | undefined;

const IMG_MAX = 2 * 1024 * 1024;
const IMG_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const baseSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name."),
  price: z.coerce.number().min(0, "Price can't be negative."),
  stock: z.coerce.number().int().min(0),
  reorderAt: z.coerce.number().int().min(0),
  category: z.string().min(1, "Pick a category."),
  newCategory: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
  accentColor: z.string().trim().optional(),
  isHot: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  isVisible: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

function parse(formData: FormData) {
  return baseSchema.safeParse({
    name: formData.get("name"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    reorderAt: formData.get("reorderAt"),
    category: formData.get("category"),
    newCategory: formData.get("newCategory"),
    description: formData.get("description"),
    accentColor: formData.get("accentColor"),
    isHot: formData.get("isHot"),
    isVisible: formData.get("isVisible"),
  });
}

function resolveCategory(category: string, newCategory?: string): string | null {
  if (category === "__new__") return (newCategory ?? "").trim() || null;
  return category;
}

async function readImage(formData: FormData): Promise<{ ext: string; bytes: Buffer } | null | "invalid"> {
  const img = formData.get("image");
  if (!(img instanceof File) || img.size === 0) return null;
  if (img.size > IMG_MAX) return "invalid";
  const ext = IMG_EXT[img.type];
  if (!ext) return "invalid";
  return { ext, bytes: Buffer.from(await img.arrayBuffer()) };
}

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireRole("SHOPKEEPER");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  const category = resolveCategory(d.category, d.newCategory);
  if (!category) return { error: "Please choose or name a category." };

  const image = await readImage(formData);
  if (image === "invalid") return { error: "Image must be PNG/JPG/WebP under 2 MB." };

  let imageKey = "";
  if (image) imageKey = await saveProductImage(randomUUID(), `image${image.ext}`, image.bytes);

  await sheets.createProduct({
    name: d.name,
    category,
    price: toPaise(d.price),
    stock: d.stock,
    reorderAt: d.reorderAt,
    description: d.description || "",
    accentColor: d.accentColor || "",
    isHot: d.isHot,
    isVisible: d.isVisible,
    imageKey,
  });

  revalidatePath("/shop/inventory");
  revalidatePath("/store");
  redirect("/shop/inventory");
}

export async function updateProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireRole("SHOPKEEPER");
  const id = String(formData.get("id") ?? "");
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  const category = resolveCategory(d.category, d.newCategory);
  if (!category) return { error: "Please choose or name a category." };

  const image = await readImage(formData);
  if (image === "invalid") return { error: "Image must be PNG/JPG/WebP under 2 MB." };

  const patch: Record<string, unknown> = {
    id,
    name: d.name,
    category,
    price: toPaise(d.price),
    stock: d.stock,
    reorderAt: d.reorderAt,
    description: d.description || "",
    accentColor: d.accentColor || "",
    isHot: d.isHot,
    isVisible: d.isVisible,
  };
  if (image) patch.imageKey = await saveProductImage(id, `image${image.ext}`, image.bytes);

  await sheets.updateProduct(patch);

  revalidatePath("/shop/inventory");
  revalidatePath("/store");
  redirect("/shop/inventory");
}
