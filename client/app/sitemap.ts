import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "http://localhost:3000";
  const [{ items }, categories] = await Promise.all([
    getProducts({ limit: 1000 }),
    getCategories(),
  ]);
  return [
    { url: base, priority: 1 },
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}` })),
    ...items.map((p) => ({ url: `${base}/product/${p.slug}` })),
  ];
}