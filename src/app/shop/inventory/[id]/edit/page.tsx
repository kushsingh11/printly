import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updateProduct } from "@/lib/actions/products";
import { ProductForm } from "@/components/shop/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("SHOPKEEPER");
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/shop/inventory" className="text-sm text-neutral-500 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Edit {product.name}</h1>
        <p className="text-sm text-neutral-500">{product.sku}</p>
      </div>
      <ProductForm
        action={updateProduct}
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          reorderAt: product.reorderAt,
          categoryId: product.categoryId,
          description: product.description,
          accentColor: product.accentColor,
          isHot: product.isHot,
          isVisible: product.isVisible,
          hasImage: !!product.imagePath,
        }}
      />
    </div>
  );
}
