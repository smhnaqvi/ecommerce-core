<!-- @format -->

# Phase 7 — Theming, Dark Mode & Component Styles

## Context

Phases 1–6 built a working, feature-complete storefront, but the styling is ad-hoc: hardcoded
`bg-black` buttons, text-only nav links, and a dark mode that only follows the OS (no toggle).
Phase 7 makes the look **consistent and themeable**: semantic color tokens that adapt to
**light/dark**, a **theme toggle**, a **basket icon** (and other icons) in the navbar, and a
reusable **Button** component so colors live in one place. Client-only, all on `feature/client`.

**Decisions locked in:** `lucide-react` for icons • **class-based** dark mode (`.dark` on `<html>`)
with a manual **toggle** that defaults to the OS preference • semantic Tailwind v4 tokens
(`bg-background`, `text-foreground`, `bg-primary`, …) • a shared `<Button>` with variants.

**Mentoring style:** Explain → you write. One step at a time.

**Heads-up:**
- This is **Tailwind v4** — dark mode and tokens are configured in **CSS** (`@custom-variant`,
  `@theme`), not a `tailwind.config.js`. Verify the syntax against your installed version.
- Dark mode's classic trap is **FOUC** (a flash of the wrong theme on load). We fix it with a tiny
  inline script that sets the class **before** React hydrates, plus `suppressHydrationWarning`.
- Per `client/AGENTS.md`, skim the relevant `node_modules/next/dist/docs/` notes before writing
  (script handling / metadata).

---

## Step 1 — Install icons

```bash
cd client
npm install lucide-react
```

> `lucide-react` is a tree-shakeable icon set — you import only the icons you use
> (`ShoppingCart`, `Search`, `Sun`, `Moon`, `User`).

---

## Step 2 — Theme tokens + class-based dark mode (`app/globals.css`)

Replace your current `globals.css` with a token system. Two key changes from the default:
1. switch dark mode from `@media (prefers-color-scheme)` to a **`.dark` class** so a toggle can
   control it;
2. add semantic tokens (primary, muted, border, etc.) that both modes redefine.

```css
@import "tailwindcss";

/* Make `dark:` utilities respond to a .dark class on a parent (instead of the OS media query). */
@custom-variant dark (&:where(.dark, .dark *));

/* Light theme (default) */
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #4f46e5;            /* indigo-600 */
  --primary-foreground: #ffffff;
  --muted: #f4f4f5;             /* zinc-100 */
  --muted-foreground: #71717a;  /* zinc-500 */
  --border: #e4e4e7;           /* zinc-200 */
  --destructive: #dc2626;       /* red-600 */
}

/* Dark theme overrides */
.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --primary: #6366f1;            /* indigo-500 (brighter on dark) */
  --primary-foreground: #ffffff;
  --muted: #18181b;             /* zinc-900 */
  --muted-foreground: #a1a1aa;  /* zinc-400 */
  --border: #27272a;           /* zinc-800 */
  --destructive: #ef4444;       /* red-500 */
}

/* Expose the CSS variables to Tailwind as color utilities. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

> Now `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`,
> `text-muted-foreground`, `border-border`, `text-destructive` all exist and **auto-swap** in dark
> mode — because the same utility reads a CSS variable whose value changes under `.dark`.

---

## Step 3 — No-flash theme script + body classes (`app/layout.tsx`)

Two edits: add `suppressHydrationWarning` to `<html>` (the inline script mutates its class before
React runs), and run the script first thing in `<body>`.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {/* Set the theme BEFORE hydration to avoid a flash of the wrong colors. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <AuthInitializer />
        <Navbar />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
```

> Concept: this runs synchronously before paint, reading `localStorage.theme` (or the OS default)
> and adding `.dark` immediately — so the first paint is already correct. `suppressHydrationWarning`
> tells React not to complain that the server HTML (no `.dark`) and the client (`.dark` added by the
> script) differ on `<html>`.

---

## Step 4 — Theme toggle (`components/ThemeToggle.tsx`)

Reads the current theme from the DOM via a `MutationObserver` (no `setState`-in-effect), and flips
it on click.

```tsx
"use client";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Subscribe to <html class> changes so the icon stays in sync with the actual theme.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function useIsDark() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"), // client
    () => false // server
  );
}

export default function ThemeToggle() {
  const isDark = useIsDark();

  function toggle() {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-md p-2 hover:bg-muted"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
```

> Concept: the same `useSyncExternalStore` pattern from the cart page, but the "external store" is
> the `<html>` element's class list. Clicking mutates the class → the observer fires → the icon
> re-renders. Server snapshot is `false` so SSR markup is stable.

---

## Step 5 — Reusable Button (`components/ui/Button.tsx`)

One component owns button colors, so theming never means hunting for `bg-black` again.

```tsx
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  outline: "border border-border bg-transparent hover:bg-muted",
  ghost: "bg-transparent hover:bg-muted",
  destructive: "bg-destructive text-white hover:opacity-90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
```

> Concept: variants map to **semantic tokens**, so every button adapts to dark mode for free. Pass
> `className` for one-offs (e.g. `className="w-full"`). For heavier class merging you can add
> `clsx` + `tailwind-merge` later — not needed yet.

---

## Step 6 — Restyle the Navbar (basket icon + toggle + tokens)

Update `components/Navbar.tsx`: swap the text "Cart" for a `ShoppingCart` icon with the badge,
add the `ThemeToggle`, and replace hardcoded colors with tokens.

```tsx
"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useIsServer } from "@/lib/useIsServer";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const isServer = useIsServer();
  const badge = isServer ? 0 : count;

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold">Buraq</Link>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />

          <Link href="/cart" className="relative rounded-md p-2 hover:bg-muted" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {badge > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {badge}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link href="/orders" className="hover:text-primary">Orders</Link>
              <span className="text-muted-foreground">Hi, {user.name}</span>
              <button onClick={logout} className="hover:text-primary">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-primary">Login</Link>
              <Link href="/register" className="hover:text-primary">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

> The badge "pops in" after hydration (Phase 6 behavior) — still correct.

---

## Step 7 — Apply the Button + tokens across the app

Swap the remaining hardcoded buttons/colors for `<Button>` and tokens. Representative changes:

- **`components/AddToCartButton.tsx`** → use `<Button>` (default `primary`), optionally with a
  `<ShoppingCart />` icon.
- **`app/cart/page.tsx`** → "Proceed to checkout" → `<Button className="w-full">`; "Remove" →
  `<Button variant="ghost" className="text-destructive">` (or keep a plain link); panel borders →
  `border-border`; muted text → `text-muted-foreground`.
- **`app/checkout/page.tsx`** → submit → `<Button className="w-full">`; inputs →
  `border-border bg-background`; summary card → `border-border`.
- **`app/login/LoginForm.tsx` / `register`** → submit → `<Button className="w-full">`.
- **`components/ProductCard.tsx`** → price uses `text-muted-foreground`; image bg `bg-muted`.
- **Empty states / "Start shopping"** links → `<Button>` styling.

Pattern: replace `bg-black text-white` → `<Button>`; `text-gray-500/600` → `text-muted-foreground`;
`border` → `border-border`; `bg-gray-100` → `bg-muted`. Hardcoded `text-red-600` for errors can
become `text-destructive`.

> Tip: search the client for `bg-black`, `text-gray-`, `bg-gray-`, `border "` to find every spot.

---

## Verification

1. Toggle the theme → colors flip instantly; reload → it **persists** (localStorage) with **no
   flash** of the old theme.
2. First visit with no saved choice follows the OS setting.
3. Navbar shows a **basket icon** with the live count badge; badge uses the primary color and is
   readable in both modes.
4. Buttons, borders, and muted text all have proper contrast in light **and** dark (no
   black-on-black or invisible borders).
5. `grep -rn "bg-black\|text-gray-\|bg-gray-" app components` returns (close to) nothing.
6. No hydration warnings in the console; `tsc --noEmit` is clean.

---

## Commit plan (your user, no Claude co-author) — all on `feature/client`

1. `chore(client): add lucide-react icons`
2. `feat(client): add semantic theme tokens and class-based dark mode`
3. `feat(client): add no-flash theme script and theme toggle`
4. `feat(client): add reusable Button component`
5. `style(client): restyle navbar with basket icon and theme tokens`
6. `style(client): apply Button and theme tokens across pages`
7. `docs: add Phase 7 theming guide`

---

## Out of scope (later)
- A full design system (typography scale, spacing tokens, more components: Input, Card, Badge)
- Brand font wiring (the default `--font-geist-*` vars referenced in CSS aren't loaded yet — add
  `next/font` if you want them)
- Per-user server-persisted theme preference, "system" as an explicit third toggle state
- Animations/transitions polish, toast notifications, skeleton theming
