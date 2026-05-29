import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatINR } from "@/lib/money";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  await requireRole("SHOPKEEPER");
  const { cat } = await searchParams;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [allProducts, categories, salesToday, pending] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { sku: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.shopOrder.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "VERIFIED", paidAt: { gte: startOfToday } },
    }),
    prisma.shopOrder.findMany({ where: { status: "READY" }, select: { total: true } }),
  ]);

  const lowStock = allProducts.filter((p) => p.stock < p.reorderAt);
  const products = cat ? allProducts.filter((p) => p.category.name === cat) : allProducts;
  const pendingValue = pending.reduce((s, o) => s + o.total, 0);

  const stats = [
    { value: String(allProducts.length), label: `Across ${categories.length} categories`, top: "Total SKUs" },
    { value: formatINR(salesToday._sum.total ?? 0), label: "today", top: "Shop sales" },
    { value: String(lowStock.length), label: "reorder soon", top: "Low stock" },
    { value: `${pending.length}`, label: `${formatINR(pendingValue)} to collect`, top: "Pending pickups" },
  ];

  return (
    <div className="p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-neutral-500">
            {allProducts.length} SKUs · {lowStock.length} low-stock alerts
          </p>
        </div>
        <Link href="/shop/inventory/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          + New item
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.top} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-400">{s.top}</p>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterTab href="/shop/inventory" active={!cat}>
          All
        </FilterTab>
        {categories.map((c) => (
          <FilterTab key={c.id} href={`/shop/inventory?cat=${encodeURIComponent(c.name)}`} active={cat === c.name}>
            {c.name}
          </FilterTab>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.stock < p.reorderAt;
              return (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-neutral-400">{p.sku}</span>
                    {p.isHot && <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">HOT</span>}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500">{p.category.name}</td>
                  <td className="px-4 py-2.5">{formatINR(p.price)}</td>
                  <td className="px-4 py-2.5">
                    <span className={low ? "font-semibold text-red-600" : ""}>{p.stock}</span>
                    {low && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">low</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.isVisible ? "bg-green-50 text-success" : "bg-neutral-100 text-neutral-500"}`}>
                      {p.isVisible ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/shop/inventory/${p.id}/edit`} className="text-xs font-medium text-brand-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-brand-600 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"}`}
    >
      {children}
    </Link>
  );
}
