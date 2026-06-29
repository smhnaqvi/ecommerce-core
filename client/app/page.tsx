import Link from "next/link";
import { getProducts, getCategories } from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";

export default async function Home() {
  const [{ items }, categories] = await Promise.all([
    getProducts({ limit: 8 }),
    getCategories(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c._id}
            href={`/category/${c.slug}`}
            className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <ProductGrid products={items} />
    </div>
  );
}