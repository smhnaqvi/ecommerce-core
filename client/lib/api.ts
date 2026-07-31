import { Category, Product, ProductListResponse, SiteSettings, Slide } from "@/types";

const API = process.env.API_URL!;
const REVALIDATE = 60; // seconds: rebuild static pages at most once per minute

export async function getProducts(
  params: Record<string, string | number> = {}
): Promise<ProductListResponse> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${API}/products?${qs}`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await fetch(`${API}/products/${slug}`, { next: { revalidate: REVALIDATE } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API}/categories`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const res = await fetch(`${API}/site-settings`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getSliders(): Promise<Slide[]> {
  try {
    const res = await fetch(`${API}/sliders`, { next: { revalidate: REVALIDATE } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}