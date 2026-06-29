<!-- @format -->

# Phase 4 — Storefront (Next.js App Router + Tailwind v4)

## Context

Phases 1–3 built the backend: cookie-JWT auth and a catalog API (`/api/categories`,
`/api/products`). Phase 4 builds the **storefront** as a **Next.js** app in `client/` — chosen
over a Vite SPA because an e-commerce shop needs **SEO**: server-rendered product HTML, per-page
`<title>`/meta tags, Open Graph, and a sitemap that crawlers can actually read.

**Decisions locked in:** Next.js **App Router** • **TypeScript** • **Tailwind v4** • catalog
pages rendered with **ISR** (static + `revalidate`) via **React Server Components + `fetch()`** •
**Zustand** for client state (auth now, cart in Phase 5) • **no TanStack Query**.

The **admin app stays a Vite SPA** (Phase 7) — it's behind a login and never needs SEO.

### The one architectural rule to remember

The auth cookie is set by the API on `:8800`; Next runs on `:3000`. The browser will **not**
send that cookie to the Next server, so SSR can't read the logged-in user without extra plumbing.
So we split rendering by need:

| Concern | Where it runs | Why |
|---|---|---|
| Home, Category, Product pages | **Server Components** (`fetch` the public API, ISR) | SEO — crawlers get real HTML |
| Auth, Cart, Checkout, My Orders | **Client Components** (axios → `:8800` with `withCredentials`) | cookie works browser→API exactly as today |

Public catalog data needs no auth, so this gives the SEO win without fighting cross-origin
cookies. (Deploy phase: put both apps on one domain and cookies unify.)

**Mentoring style:** Explain → you write. One step at a time. Verify before Phase 5.

---

## What we'll end up with

```
client/
├── .env.local                      # API_URL (server), NEXT_PUBLIC_API_URL (browser)
├── .env.example
├── next.config.ts                  # allow Cloudinary images
├── app/
│   ├── globals.css                 # @import "tailwindcss";
│   ├── layout.tsx                  # root layout, Navbar, default metadata
│   ├── page.tsx                    # Home (server, ISR)
│   ├── category/[slug]/page.tsx    # listing (server) + generateMetadata
│   ├── product/[slug]/page.tsx     # detail (server, ISR) + generateMetadata + generateStaticParams
│   ├── login/page.tsx              # client
│   ├── register/page.tsx           # client
│   └── sitemap.ts                  # SEO
├── lib/
│   ├── api.ts                      # server-side fetch helpers (catalog)
│   └── authApi.ts                  # browser axios (auth)
├── store/authStore.ts              # Zustand (client)
├── components/
│   ├── Navbar.tsx                  # client
│   ├── AuthInitializer.tsx         # client; bootstraps getMe()
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   └── CategoryControls.tsx        # client; search + pagination via URL
└── types.ts
```

---

## Step 0 — Update server CORS (do this first)

The storefront now runs on `:3000`, so point the server's allowed origin there.

In `server/.env` and `.env.example`: `CLIENT_URL=http://localhost:3000`

If you didn't add CORS yet (it was deferred earlier):

```bash
cd server && npm install cors && npm install -D @types/cors
```

In `server/src/app.ts`, before the routes:

```ts
import cors from "cors";

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
```

> Note: only the **browser** calls need CORS. Server Components fetch the API server-to-server
> (Next server → Express), which isn't subject to CORS at all.

Restart the server.

---

## Step 1 — Scaffold the Next.js app

From the repo root:

```bash
npx create-next-app@latest client --ts --app --tailwind --eslint --import-alias "@/*" --no-src-dir
cd client
npm install zustand axios
```

> When prompted, accept Turbopack. `create-next-app` sets up Tailwind v4 for you
> (`app/globals.css` already has `@import "tailwindcss";`). The `@/*` import alias lets you
> write `@/lib/api` instead of long relative paths.

---

## Step 2 — Env + Cloudinary images

`client/.env.local`:

```
# Used by Server Components (server -> API). Not exposed to the browser.
API_URL=http://localhost:8800/api
# Used by client components (browser -> API). Must be NEXT_PUBLIC_ to reach the browser.
NEXT_PUBLIC_API_URL=http://localhost:8800/api
```

Add both keys (empty) to `client/.env.example`. Confirm `.env.local` is gitignored (Next's
default `.gitignore` already ignores `.env*`).

`client/next.config.ts` — allow `next/image` to load Cloudinary URLs:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
```

> Concept: two API base URLs. Server-only secrets stay unprefixed (`API_URL`); anything the
> browser needs must start with `NEXT_PUBLIC_`. In dev they point to the same place.

---

## Step 3 — Types + server-side catalog fetch (`lib/api.ts`)

`client/types.ts`:

```ts
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  countInStock: number;
  category: Category;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  pages: number;
  total: number;
}
```

`client/lib/api.ts` — note `next: { revalidate }`, which is what makes pages **ISR**:

```ts
import { Category, Product, ProductListResponse } from "@/types";

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
```

> Concept — **ISR**: Next caches the result and serves static HTML; after `revalidate` seconds
> the next request triggers a background rebuild. Fast like static, fresh like dynamic. No
> TanStack Query needed — the framework's `fetch` cache does the caching.

---

## Step 4 — Root layout + default metadata + Navbar

`client/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthInitializer from "@/components/AuthInitializer";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: { default: "Buraq Store", template: "%s | Buraq Store" },
  description: "Shop the latest products at Buraq Store.",
  openGraph: { type: "website", siteName: "Buraq Store" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthInitializer />
        <Navbar />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
```

`client/components/Navbar.tsx` (client — reads the auth store):

```tsx
"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold">Buraq</Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span>Hi, {user.name}</span>
              <button onClick={logout} className="underline">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

> Concept — **`"use client"`**: by default every component in `app/` is a Server Component.
> Anything using hooks, state, or browser APIs (the store, `onClick`) must declare `"use client"`.
> Keep client components small and at the leaves; pages stay server components for SEO.

---

## Step 5 — Home page (server, ISR)

`client/app/page.tsx`:

```tsx
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
```

> Concept: the page is an `async` function — it `await`s data **on the server**, so the HTML ships
> with products already in it. That's the whole SEO point.

---

## Step 6 — Product card + grid

`client/components/ProductCard.tsx`:

```tsx
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium">{product.name}</h3>
      <p className="text-sm text-gray-600">${product.price}</p>
    </Link>
  );
}
```

`client/components/ProductGrid.tsx`:

```tsx
import { Product } from "@/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <p className="text-gray-500">No products found.</p>;
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
```

> Concept — `next/image`: automatic resizing, lazy loading, and modern formats. It needs the
> Cloudinary host whitelisted (Step 2) and a sized container (`fill` + a `relative` parent).

---

## Step 7 — Product detail (server, ISR, per-product SEO)

`client/app/product/[slug]/page.tsx`:

```tsx
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
```

> Concepts: `generateStaticParams` pre-builds product pages so crawlers hit instant static HTML;
> `generateMetadata` gives each product its own title/description/OG image (huge for SEO and link
> previews). In Next 15+, `params` is a Promise — `await` it.

---

## Step 8 — Category listing + client controls

The page (server) reads `searchParams`, so search/pagination are shareable, crawlable URLs.

`client/app/category/[slug]/page.tsx`:

```tsx
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
```

`client/components/CategoryControls.tsx` (client — pushes state into the URL):

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CategoryControls({
  slug,
  search,
  page,
  pages,
}: {
  slug: string;
  search: string;
  page: number;
  pages: number;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(search);

  function go(next: { search?: string; page?: number }) {
    const sp = new URLSearchParams();
    const s = next.search ?? term;
    const p = next.page ?? 1;
    if (s) sp.set("search", s);
    if (p > 1) sp.set("page", String(p));
    router.push(`/category/${slug}?${sp.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <form onSubmit={(e) => { e.preventDefault(); go({ search: term, page: 1 }); }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search…"
          className="rounded border px-3 py-1 text-sm"
        />
      </form>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => go({ page: page - 1 })}
            className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="text-sm">Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => go({ page: page + 1 })}
            className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
```

> Concept: instead of client-side fetching, the control component just changes the URL; the
> server component re-renders with new `searchParams`. URLs like `/category/shoes?search=run` are
> shareable and indexable — a quiet SEO win you'd lose with a pure client filter.

---

## Step 9 — Auth (client): axios + Zustand + bootstrap

`client/lib/authApi.ts`:

```ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // send/receive the http-only auth cookie
});

export interface User { _id: string; name: string; email: string; isAdmin: boolean; }

export const login = (email: string, password: string) =>
  api.post<User>("/auth/login", { email, password }).then((r) => r.data);
export const register = (name: string, email: string, password: string) =>
  api.post<User>("/auth/register", { name, email, password }).then((r) => r.data);
export const logout = () => api.post("/auth/logout").then(() => {});
export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);
```

`client/store/authStore.ts`:

```ts
import { create } from "zustand";
import * as authApi from "@/lib/authApi";
import type { User } from "@/lib/authApi";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    try { set({ user: await authApi.getMe() }); }
    catch { set({ user: null }); }
    finally { set({ loading: false }); }
  },
  login: async (email, password) => set({ user: await authApi.login(email, password) }),
  register: async (name, email, password) =>
    set({ user: await authApi.register(name, email, password) }),
  logout: async () => { await authApi.logout(); set({ user: null }); },
}));
```

`client/components/AuthInitializer.tsx` (runs once, renders nothing):

```tsx
"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function AuthInitializer() {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  useEffect(() => { fetchUser(); }, [fetchUser]);
  return null;
}
```

`client/app/login/page.tsx` (client):

```tsx
"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try { await login(email, password); router.push("/"); }
    catch { setError("Invalid email or password"); }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="w-full rounded bg-black py-2 text-white">Login</button>
    </form>
  );
}
```

`client/app/register/page.tsx` — same shape with a `name` field, calling
`const register = useAuthStore((s) => s.register)` then `register(name, email, password)`.

> Reminder: these run in the browser and talk to `:8800` directly with `withCredentials`, so the
> cookie behaves exactly like in the Phase 2/3 curl tests. SSR never touches auth.

---

## Step 10 — SEO finishing touch: sitemap

`client/app/sitemap.ts`:

```ts
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
```

> Next serves this at `/sitemap.xml` automatically. At deploy time, swap `base` for your real
> domain (env var). A `robots.ts` can be added the same way.

---

## Verification (end of Phase 4)

Run both apps:
- Terminal 1: `cd server && npm run dev` (port 8800)
- Terminal 2: `cd client && npm run dev` (port 3000)

Make sure Phase 3 left you at least one category and one product (with image).

1. Open `http://localhost:3000` → Home shows category chips + product grid with Cloudinary images.
2. **SEO proof:** `curl -s http://localhost:3000/product/<slug> | grep -i "<title>"` — the product
   **name is already in the HTML** (server-rendered). Do the same for a Vite SPA and you'd see an
   empty shell — this is the whole reason we switched.
3. View page source on a product → `<title>Name | Buraq Store</title>` and `og:*` meta tags.
4. `http://localhost:3000/sitemap.xml` lists home, categories, and products.
5. Category page: type in search / click Prev-Next → URL changes to `?search=&page=`, grid updates,
   and the URL is shareable.
6. Register an account → navbar shows "Hi, <name>"; refresh → still logged in. Logout works.
7. DevTools → Network: auth calls go to `:8800/api/...` with the cookie; no CORS errors.

---

## Commit plan (your user, no Claude co-author)
1. `feat(server): allow CORS credentials from the Next.js client`
2. `chore(client): scaffold Next.js App Router app with Tailwind v4`
3. `feat(client): add server-side catalog fetch helpers (ISR)`
4. `feat(client): add home, category and product pages with SEO metadata`
5. `feat(client): add zustand auth store and login/register`
6. `feat(client): add sitemap`
7. `docs: rewrite Phase 4 guide for Next.js storefront`

---

## Out of scope (later phases)
- Cart ("Add to cart", Zustand + localStorage `persist`) and checkout (Phase 5)
- Stripe payment UI (Phase 6)
- Protected pages (My Orders) — client-guarded via the auth store; SSR-protected routes need the
  shared-domain cookie setup from the deploy phase
- `robots.ts`, JSON-LD product structured data, dynamic OG images (Phase 8 polish)
- Switching `metadataBase`/sitemap base URL to env-driven values (deploy phase)
```
