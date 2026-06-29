import type { Metadata } from "next";
import { getProducts } from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";
import CategoryControls from "@/components/CategoryControls";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug, description: `Browse ${slug} at Buraq Store.` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { search = "", page = "1" } = await searchParams;

  const data = await getProducts({ category: slug, search, page, limit: 12 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold capitalize">{slug}</h1>
      <CategoryControls slug={slug} search={search} page={data.page} pages={data.pages} />
      <ProductGrid products={data.items} />
    </div>
  );
}