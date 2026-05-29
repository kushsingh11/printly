import Link from "next/link";
import { listCategories } from "@/lib/sheets";
import { requireRole } from "@/lib/session";
import { createProduct } from "@/lib/actions/products";
import { ProductForm } from "@/components/shop/ProductForm";

export default async function NewProductPage() {
  await requireRole("SHOPKEEPER");
  const categories = await listCategories();

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/shop/inventory" className="text-sm text-neutral-500 hover:underline">
          ← Inventory
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Add new item</h1>
        <p className="text-sm text-neutral-500">Goes live on the student shop the moment you publish.</p>
      </div>
      <ProductForm action={createProduct} categories={categories} />
    </div>
  );
}
