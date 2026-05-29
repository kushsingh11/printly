"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { nextCode } from "@/lib/codes";
import { toPaise } from "@/lib/money";
import { saveProductImage } from "@/lib/storage";

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
  categoryId: z.string().min(1, "Pick a category."),
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
    categoryId: formData.get("categoryId"),
    newCategory: formData.get("newCategory"),
    description: formData.get("description"),
    accentColor: formData.get("accentColor"),
    isHot: formData.get("isHot"),
    isVisible: formData.get("isVisible"),
  });
}

/** Resolve the chosen category, creating a new one if requested. */
async function resolveCategoryId(categoryId: string, newCategory?: string): Promise<string | null> {
  if (categoryId === "__new__") {
    const name = (newCategory ?? "").trim();
    if (!name) return null;
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    return cat.id;
  }
  const exists = await prisma.category.findUnique({ where: { id: categoryId } });
  return exists ? exists.id : null;
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

  const categoryId = await resolveCategoryId(d.categoryId, d.newCategory);
  if (!categoryId) return { error: "Please choose or name a category." };

  const image = await readImage(formData);
  if (image === "invalid") return { error: "Image must be PNG/JPG/WebP under 2 MB." };

  const sku = await nextCode("sku", "P");
  const product = await prisma.product.create({
    data: {
      sku,
      name: d.name,
      categoryId,
      price: toPaise(d.price),
      stock: d.stock,
      reorderAt: d.reorderAt,
      description: d.description || null,
      accentColor: d.accentColor || null,
      isHot: d.isHot,
      isVisible: d.isVisible,
    },
  });

  if (image) {
    const rel = await saveProductImage(product.id, `image${image.ext}`, image.bytes);
    await prisma.product.update({ where: { id: product.id }, data: { imagePath: rel } });
  }

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
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product not found." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  const categoryId = await resolveCategoryId(d.categoryId, d.newCategory);
  if (!categoryId) return { error: "Please choose or name a category." };

  const image = await readImage(formData);
  if (image === "invalid") return { error: "Image must be PNG/JPG/WebP under 2 MB." };

  let imagePath = existing.imagePath;
  if (image) {
    imagePath = await saveProductImage(id, `image${image.ext}`, image.bytes);
  }

  await prisma.product.update({
    where: { id },
    data: {
      name: d.name,
      categoryId,
      price: toPaise(d.price),
      stock: d.stock,
      reorderAt: d.reorderAt,
      description: d.description || null,
      accentColor: d.accentColor || null,
      isHot: d.isHot,
      isVisible: d.isVisible,
      imagePath,
    },
  });

  revalidatePath("/shop/inventory");
  revalidatePath("/store");
  redirect("/shop/inventory");
}
