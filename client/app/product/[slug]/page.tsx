import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getProducts } from "@/lib/api";

// Pre-render the most recent products at build time.
export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 50 });
  return items.map((p) => ({ slug: p.slug }));
}

// Per-product <title>, description, Open Graph image.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images[0] ? [product.images[0]] : [] },
  };
}

export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {product.images[0] && (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
        )}
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-2xl">${product.price}</p>
        <p className="text-gray-600">{product.description}</p>
        <p className="text-sm text-gray-500">
          {product.countInStock > 0 ? "In stock" : "Out of stock"}
        </p>
        {/* "Add to cart" (client component) arrives in Phase 5 */}
      </div>
    </div>
  );
}