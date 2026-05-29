"use client";

import { useActionState, useState } from "react";
import { type ProductActionState } from "@/lib/actions/products";
import { formatINR, toPaise } from "@/lib/money";

type Initial = {
  id: string;
  name: string;
  price: number; // paise
  stock: number;
  reorderAt: number;
  category: string;
  description: string | null;
  accentColor: string | null;
  isHot: boolean;
  isVisible: boolean;
  hasImage: boolean;
};

const inputClass = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const label = "mb-1 block text-xs font-medium text-neutral-500";

export function ProductForm({
  action,
  categories,
  initial,
}: {
  action: (prev: ProductActionState, formData: FormData) => Promise<ProductActionState>;
  categories: string[];
  initial?: Initial;
}) {
  const [state, formAction, isPending] = useActionState<ProductActionState, FormData>(action, undefined);

  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price / 100) : "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "__new__");
  const [accentColor, setAccentColor] = useState(initial?.accentColor ?? "#ffe2d2");
  const [isHot, setIsHot] = useState(initial?.isHot ?? false);
  const [imgPreview, setImgPreview] = useState<string | null>(
    initial?.hasImage ? `/api/products/${initial.id}/image` : null,
  );

  const categoryName = category === "__new__" ? "New" : category;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <form action={formAction} className="space-y-4">
        {initial && <input type="hidden" name="id" value={initial.id} />}

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Item details</h2>
          <div className="space-y-3">
            <div>
              <label className={label}>Product name</label>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>

            <div>
              <label className={label}>Category</label>
              <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__new__">+ New category</option>
              </select>
              {category === "__new__" && (
                <input name="newCategory" placeholder="New category name" className={`${inputClass} mt-2`} />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={label}>Price (₹)</label>
                <input name="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={label}>In stock</label>
                <input name="stock" type="number" min="0" defaultValue={initial?.stock ?? 0} className={inputClass} />
              </div>
              <div>
                <label className={label}>Reorder at</label>
                <input name="reorderAt" type="number" min="0" defaultValue={initial?.reorderAt ?? 0} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={label}>Description</label>
              <textarea name="description" defaultValue={initial?.description ?? ""} rows={2} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-600">Appearance</h2>
          <div className="space-y-3">
            <div>
              <label className={label}>Product image (PNG/JPG/WebP, max 2 MB)</label>
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setImgPreview(f ? URL.createObjectURL(f) : imgPreview);
                }}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className={label}>Accent color</label>
              <input type="color" name="accentColor" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-8 w-12 rounded" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isHot" checked={isHot} onChange={(e) => setIsHot(e.target.checked)} className="h-4 w-4" />
              Mark as &apos;HOT&apos; on the shop
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isVisible" defaultChecked={initial?.isVisible ?? true} className="h-4 w-4" />
              Visible to students
            </label>
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={isPending} className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {isPending ? "Saving…" : initial ? "Save changes" : "Publish item"}
        </button>
      </form>

      {/* Live preview */}
      <div>
        <p className="mb-2 text-xs font-medium text-neutral-400">Live preview · student shop</p>
        <div className="w-40 rounded-xl border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg text-2xl font-semibold text-neutral-400" style={{ backgroundColor: accentColor }}>
            {imgPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{categoryName[0] ?? "?"}</span>
            )}
          </div>
          {isHot && <span className="mb-1 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">HOT</span>}
          <p className="line-clamp-2 text-sm font-medium">{name || "Product name"}</p>
          <p className="text-xs text-neutral-400">{categoryName || "Category"}</p>
          <p className="mt-1 text-sm font-semibold">{price ? formatINR(toPaise(price)) : "₹0"}</p>
        </div>
      </div>
    </div>
  );
}
