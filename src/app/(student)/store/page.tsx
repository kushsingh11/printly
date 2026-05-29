import Link from "next/link";
import { listProducts } from "@/lib/sheets";
import { formatINR } from "@/lib/money";
import { AddToCartButton } from "@/components/student/AddToCartButton";

export default async function StorePage() {
  const products = (await listProducts(true)).sort(
    (a, b) => Number(b.isHot) - Number(a.isHot) || a.name.localeCompare(b.name),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stationery store</h1>
        <Link href="/store/cart" className="text-sm font-medium text-brand-600 hover:underline">
          View cart →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {products.map((p) => {
          const out = p.stock <= 0;
          return (
            <div key={p.id} className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3">
              <div
                className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg text-2xl font-semibold text-neutral-400"
                style={{ backgroundColor: p.accentColor ?? "#f5f5f4" }}
              >
                {p.imageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/products/${p.id}/image`}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{p.category[0]}</span>
                )}
              </div>

              {p.isHot && (
                <span className="mb-1 inline-block w-fit rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                  HOT
                </span>
              )}
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs text-neutral-400">{p.category}</p>
              <p className="mt-1 text-sm font-semibold">{formatINR(p.price)}</p>

              <div className="mt-2">
                <AddToCartButton
                  product={{ productId: p.id, name: p.name, price: p.price }}
                  disabled={out}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
