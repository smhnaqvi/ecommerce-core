

# Phase 6 — Storefront Polish

## Context

Phases 1–5 delivered a working shop: catalog, cart, logged-in COD checkout, and orders. Guest
checkout was considered and **dropped** — the current logged-in flow stays as-is. Phase 6 ties off
the loose ends that make the storefront feel finished: a **cart badge**, a working **login
redirect**, **loading states**, **search**, and a round of **SEO** improvements. No backend
changes — this is all `feature/client`.

**Mentoring style:** Explain → you write. One step at a time; verify as you go.

**Heads-up (App Router gotchas this phase hits):**

- Reading `localStorage`/`sessionStorage` during render risks a hydration mismatch → we guard with
the same `useIsServer` trick as the cart page.
- `useSearchParams()` must sit inside a `<Suspense>` boundary or Next errors at build → we split
the login form out and wrap it.
- Per `client/AGENTS.md`, read the relevant `node_modules/next/dist/docs/` guide before writing
(`use-search-params.md`, `loading.md`/`file-conventions`, `metadata`/`robots`).

---



## Step 1 — Shared `useIsServer` hook + Navbar cart badge

You already wrote the `useIsServer` trick inline in `app/cart/page.tsx`. Promote it to a shared
hook so the Navbar (and others) can reuse it.

`lib/useIsServer.ts`:

```ts
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// true during SSR + the first hydration render, false thereafter — lets a component safely
// render client-only values (localStorage, etc.) without a hydration mismatch.
export function useIsServer() {
  return useSyncExternalStore(noopSubscribe, () => false, () => true);
}
```

> Optional cleanup: replace the inline copies in `app/cart/page.tsx` and
> `app/order/...`/`app/orders` if you have them, importing this instead.

Now the badge. Update `components/Navbar.tsx` — add a Cart link with a live item count:

```tsx
"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useIsServer } from "@/lib/useIsServer";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const isServer = useIsServer();
  const badge = isServer ? 0 : count; // 0 on the server so markup matches

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold">Buraq</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/cart" className="relative">
            Cart
            {badge > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-black px-1.5 text-xs text-white">
                {badge}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link href="/orders">Orders</Link>
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

> Concept: on the server the cart is empty (no localStorage), so we render `0` (no badge) to match
> the server HTML, then show the real count after hydration. The badge "pops in" — that's correct,
> not a bug.

---



## Step 2 — Login `?redirect` round-trip

Today `app/login/page.tsx` always pushes `/`. The cart/checkout already send
`?redirect=/checkout`, so make login honor it. `useSearchParams()` needs a Suspense boundary, so
split the form into a child component.

`app/login/page.tsx` (server-ish wrapper):

```tsx
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
```

`app/login/LoginForm.tsx` (the existing form, now reading the param):

```tsx
"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push(redirect);
    } catch {
      setError("Invalid email or password");
    }
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
      <p className="text-sm text-gray-500">
        No account? <a href={`/register?redirect=${redirect}`} className="underline">Register</a>
      </p>
    </form>
  );
}
```

> Do the same split for `app/register/page.tsx` if you want register to also return users to
> checkout. Read `use-search-params.md` first (AGENTS.md) — the Suspense requirement is the part
> that bites people.

---



## Step 3 — Loading states

App Router renders a route's `loading.tsx` (a Suspense fallback) while its server component awaits
data. Add a reusable skeleton, then drop `loading.tsx` beside the data-fetching pages.

`components/Skeleton.tsx`:

```tsx
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
```

`app/loading.tsx` (home) and `app/category/[slug]/loading.tsx`:

```tsx
import { ProductGridSkeleton } from "@/components/Skeleton";
export default function Loading() {
  return <ProductGridSkeleton />;
}
```

> Concept: `loading.tsx` is automatic — Next wraps the segment in `<Suspense>` with this as the
> fallback. No imports into your pages needed. Read the file-conventions `loading` doc first.

---



## Step 4 — Search

A global search box in the Navbar that navigates to a `/search` results page (server-rendered, so
results are crawlable too).

Add to the Navbar (inside the client component) a small form:

```tsx
// in Navbar, with the other imports:
import { useRouter } from "next/navigation";
import { useState } from "react";

// inside the component:
const router = useRouter();
const [q, setQ] = useState("");

// in the JSX (e.g. before the links):
<form onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`); }}>
  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
    className="rounded border px-3 py-1 text-sm" />
</form>
```

`app/search/page.tsx` (server component):

```tsx
import type { Metadata } from "next";
import { getProducts } from "@/lib/api";
import ProductGrid from "@/components/ProductGrid";

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ q?: string }> }
): Promise<Metadata> {
  const { q = "" } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage(
  { searchParams }: { searchParams: Promise<{ q?: string }> }
) {
  const { q = "" } = await searchParams;
  const data = q ? await getProducts({ search: q, limit: 24 }) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {q ? `Results for “${q}”` : "Search"}
      </h1>
      {data ? <ProductGrid products={data.items} /> : <p className="text-gray-500">Type a query above.</p>}
    </div>
  );
}
```

> Reuses your existing `getProducts({ search })` — the API already supports the `search` param from
> Phase 3.

---



## Step 5 — SEO improvements

**5a. Env-driven base URL.** Hardcoded `http://localhost:3000` lives in `app/layout.tsx`
(`metadataBase`) and `app/sitemap.ts`. Move it to an env var so production is correct.

`.env.local` and `.env.example`: add `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

Then in both files use it:

```ts
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
// layout.tsx:  metadataBase: new URL(SITE),
// sitemap.ts:  const base = SITE;
```

**5b.** `app/robots.ts` (Next serves it at `/robots.txt`):

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cart", "/checkout", "/orders"] },
    sitemap: `${site}/sitemap.xml`,
  };
}
```

**5c. Product structured data (JSON-LD).** Helps Google show price/availability rich results. Add
to `app/product/[slug]/page.tsx`, inside the returned JSX (it's a Server Component, so it renders
in the HTML):

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: product.images,
      description: product.description,
      offers: {
        "@type": "Offer",
        price: product.price,
        priceCurrency: "USD",
        availability:
          product.countInStock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    }),
  }}
/>
```

> Concept: JSON-LD is a `<script>` block crawlers parse for rich results. Because the product page
> is server-rendered, it's in the initial HTML where Google expects it.

---



## Verification

1. Add items to the cart → Navbar badge shows the total qty, updates live, survives refresh, and
  shows nothing when empty. No hydration warning in the console.
2. Logged out, click "Proceed to checkout" → login → after logging in you land on **/checkout**,
  not `/`.
3. Throttle the network (DevTools) and navigate home/category → skeletons appear, then content.
4. Type in the Navbar search → `/search?q=…` lists matching products; the URL is shareable.
5. `curl -s http://localhost:3000/robots.txt` and `/sitemap.xml` return correct content with your
  `NEXT_PUBLIC_SITE_URL`.
6. View source on a product → a `<script type="application/ld+json">` Product block is present;
  paste the page URL into Google's Rich Results Test later to validate.

---



## Commit plan (your user, no Claude co-author) — all on `feature/client`

1. `feat(client): add shared useIsServer hook and navbar cart badge`
2. `feat(client): honor login redirect param`
3. `feat(client): add loading skeletons for catalog pages`
4. `feat(client): add product search page`
5. `feat(client): env-driven site url, robots and product JSON-LD`
6. `docs: add Phase 6 storefront polish guide`

---



## Out of scope (later)

- Payments / Stripe (a dedicated later phase)
- Admin dashboard (next major phase: product CRUD UI + order management)
- Toast notifications, image gallery/zoom, related products, reviews
- Debounced live search-as-you-type (current search is submit-based)

