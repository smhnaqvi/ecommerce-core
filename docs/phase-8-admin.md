<!-- @format -->

# Phase 8 — Admin Dashboard (Vite + React + TanStack Query)

## Context

Phases 1–7 built the API, the storefront, and theming — but the only way to manage products,
categories, and orders is `curl`. Phase 8 adds the **admin app**: a separate **Vite + React SPA**
in `admin/` (no SEO needed, so no Next.js) for admin login, **product CRUD with image upload**,
**category management**, and **order management** (list all + update status).

**Decisions locked in:** Vite + React + **TypeScript** • **Tailwind v4** • **axios + TanStack
Query** (lists + mutations with auto-refetch) • **Zustand** for auth • React Router • reuses the
existing **cookie auth**, gated to `isAdmin`.

**Branch split:** server work on `feature/server`, admin app on a new `feature/admin` branch.

**Mentoring style:** Explain → you write. One step at a time.

---

## Part A — Server (`feature/server`)

Product/category admin endpoints already exist. Two gaps remain: multi-origin CORS, and admin
order endpoints.

### Step A1 — Allow the admin origin in CORS

The admin runs on a different port (`:5173`) than the storefront (`:3001`), so CORS must accept
**both**. In `server/src/app.ts`, replace the single-origin config:

```ts
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(
  Boolean
) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow same-origin / tools with no Origin header, and any in the allowlist
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
```

Add to `server/.env` (and `.env.example`): `ADMIN_URL=http://localhost:5173`

> Dev cookie note: `localhost:5173` and `localhost:8800` are the same *site*, so the `lax` cookie
> works (same as the storefront). Both apps on `localhost` even share the cookie jar — fine for
> dev; production uses separate subdomains.

### Step A2 — Admin order endpoints (`src/controllers/order.controller.ts`)

Add two admin-only handlers:

```ts
// GET /api/orders  (admin) — every order, newest first, with buyer info
export async function listAllOrders(_req: Request, res: Response) {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(orders);
}

// PATCH /api/orders/:id/status  (admin)
export async function updateOrderStatus(req: Request, res: Response) {
  const { status } = req.body as { status: IOrder["status"] };
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.status = status;
  if (status === "delivered" && !order.isPaid) {
    order.isPaid = true; // COD considered paid on delivery
    order.paidAt = new Date();
  }
  await order.save();
  res.json(order);
}
```

### Step A3 — Wire the routes (`src/routes/order.routes.ts`)

```ts
import { Router } from "express";
import { protect } from "../middleware/protect";
import { isAdmin } from "../middleware/isAdmin";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  listAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller";

const router = Router();
router.use(protect);

router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/", isAdmin, listAllOrders);            // admin: all orders
router.patch("/:id/status", isAdmin, updateOrderStatus); // admin
router.get("/:id", getOrderById);                   // keep LAST (param route)

export default router;
```

> Order matters: literal paths (`/mine`, `/`) and `/:id/status` go **before** `/:id`, or the
> param route swallows them.

### Server verification (admin cookie)

```bash
curl -b cookies.txt http://localhost:8800/api/orders            # admin: array of all orders
curl -b cookies.txt -X PATCH http://localhost:8800/api/orders/<id>/status \
  -H 'Content-Type: application/json' -d '{"status":"shipped"}'  # -> updated order
curl -b cookies.txt http://localhost:8800/api/orders            # as NON-admin -> 403
```

---

## Part B — Admin app (`feature/admin`)

### Step B1 — Scaffold

From the repo root:

```bash
npm create vite@latest admin -- --template react-ts
cd admin
npm install
npm install react-router-dom axios @tanstack/react-query zustand
npm install tailwindcss @tailwindcss/vite
```

`vite.config.ts` — add the Tailwind plugin and pin the port:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
```

Replace `src/index.css` with `@import "tailwindcss";` and delete `src/App.css`.

### Step B2 — Env + axios client

`admin/.env`:

```
VITE_API_URL=http://localhost:8800/api
```

(+ `admin/.env.example` with the key empty.)

`src/api/client.ts`:

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
```

### Step B3 — Types + API modules

`src/api/types.ts` — reuse the shapes from the storefront (`Category`, `Product`,
`ProductListResponse`, `User`) and add an `Order`:

```ts
export interface Order {
  _id: string;
  user?: { _id: string; name: string; email: string };
  items: { product: string; name: string; price: number; qty: number }[];
  totalPrice: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  isPaid: boolean;
  createdAt: string;
}
```

`src/api/products.ts`, `categories.ts`, `orders.ts`, `auth.ts` — thin wrappers over `api`.
Examples:

```ts
// products.ts
export const listProducts = () => api.get("/products", { params: { limit: 100 } }).then(r => r.data);
export const deleteProduct = (id: string) => api.delete(`/products/${id}`).then(r => r.data);
export const createProduct = (form: FormData) =>
  api.post("/products", form).then(r => r.data);     // multipart, browser sets the header
export const updateProduct = (id: string, form: FormData) =>
  api.put(`/products/${id}`, form).then(r => r.data);

// orders.ts
export const listAllOrders = () => api.get("/orders").then(r => r.data);
export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/orders/${id}/status`, { status }).then(r => r.data);

// auth.ts
export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password }).then(r => r.data);
export const getMe = () => api.get("/auth/me").then(r => r.data);
export const logout = () => api.post("/auth/logout").then(() => {});
```

### Step B4 — Auth store + admin guard

`src/store/authStore.ts` — mirror the storefront's Zustand store (`user`, `loading`, `fetchUser`,
`login`, `logout`). One extra rule: **only admins may use this app.**

In the `login` action, after a successful login, reject non-admins:

```ts
login: async (email, password) => {
  const user = await authApi.login(email, password);
  if (!user.isAdmin) throw new Error("Admin access only");
  set({ user });
},
```

`src/components/RequireAdmin.tsx` — a route guard:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function RequireAdmin() {
  const { user, loading } = useAuthStore();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

> Note: this is **client-side** gating for UX. The real security is the server's `protect` +
> `isAdmin` on every write — never trust the client.

### Step B5 — Providers (`src/main.tsx`)

Wrap with QueryClient + Router (Zustand needs no provider). Add a `lib/queryClient.ts` like the
storefront, and bootstrap `fetchUser()` once in `App` (a `useEffect`).

### Step B6 — Layout + routes (`src/App.tsx`)

A sidebar layout for the admin area, with the public `/login` outside the guard:

```tsx
import { Routes, Route } from "react-router-dom";
import RequireAdmin from "@/components/RequireAdmin";
import AdminLayout from "@/components/AdminLayout";
import Login from "@/pages/Login";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import Categories from "@/pages/Categories";
import Orders from "@/pages/Orders";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

`AdminLayout` = a sidebar (`Products`, `Categories`, `Orders`, Logout) + `<Outlet />`.

### Step B7 — Products list (TanStack Query + delete mutation)

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as productsApi from "@/api/products";

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.listProducts,
  });

  const del = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/products/new" className="rounded bg-black px-4 py-2 text-white">New product</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-2">Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {data.items.map((p: any) => (
            <tr key={p._id} className="border-b">
              <td className="p-2">{p.name}</td>
              <td>${p.price}</td>
              <td>{p.countInStock}</td>
              <td className="space-x-2 text-right">
                <Link to={`/products/${p._id}/edit`} className="underline">Edit</Link>
                <button onClick={() => del.mutate(p._id)} className="text-red-600 underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

> Concept — **mutation + invalidate**: after delete succeeds, `invalidateQueries(["products"])`
> tells React Query the list is stale; it refetches automatically. This is exactly the pattern you
> dropped on the storefront (RSC handled it there) but want here.

### Step B8 — Product form with image upload

Create/edit in one component (`/products/new` vs `/products/:id/edit`). Build a `FormData` so the
files reach the server's `upload.array("images")`:

```tsx
const form = new FormData();
form.append("name", name);
form.append("price", String(price));
form.append("countInStock", String(stock));
form.append("category", categoryId);
form.append("description", description);
for (const file of files) form.append("images", file); // <input type="file" multiple>

// create or update mutation, then navigate back to "/" and invalidate ["products"]
```

- Load categories with `useQuery(["categories"], categoriesApi.list)` for the `<select>`.
- On edit, prefill from the product (pass it via router state from the list, or fetch it).
- `<input type="file" multiple accept="image/*" onChange={e => setFiles([...e.target.files])} />`.

> Don't set a `Content-Type` header manually — when you pass a `FormData`, the browser sets
> `multipart/form-data` **with the boundary**. Setting it yourself breaks the upload.

### Step B9 — Categories page

A simple CRUD: `useQuery(["categories"])` for the list, a small form to create, and delete
buttons — each mutation invalidates `["categories"]`. Mirror the Products patterns.

### Step B10 — Orders management

```tsx
const { data: orders } = useQuery({ queryKey: ["orders"], queryFn: ordersApi.listAllOrders });
const setStatus = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateOrderStatus(id, status),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
});

// each row: customer (order.user?.email), total, date, and a <select> bound to setStatus:
// <select value={o.status} onChange={(e) => setStatus.mutate({ id: o._id, status: e.target.value })}>
//   {["pending","processing","shipped","delivered","cancelled"].map(s => <option key={s}>{s}</option>)}
// </select>
```

---

## Verification (end of Phase 8)

Run all three: server (`:8800`), storefront (`:3001`), admin (`:5173`). Log into the admin with a
user that has `isAdmin: true`.

1. Non-admin login on the admin app is rejected ("Admin access only").
2. Products: create a product with images → appears in the list **and** on the storefront; edit
   price → storefront reflects it after ISR revalidate; delete → gone from both.
3. New product's images land in Cloudinary (`buraq/products`) and show on the storefront.
4. Categories: create/delete → storefront category chips update.
5. Orders: place an order on the storefront → it appears in admin Orders; change status to
   "shipped" → the buyer sees it under storefront `/orders`; "delivered" flips `isPaid`.
6. No CORS errors from either `:3001` or `:5173`.

---

## Commit plan (your user, no Claude co-author)

**On `feature/server`:**
1. `feat(server): allow multiple CORS origins (client + admin)`
2. `feat(server): add admin order listing and status update`

**On `feature/admin`:**
3. `chore(admin): scaffold Vite React+TS app with Tailwind v4`
4. `feat(admin): add api layer, auth store and admin route guard`
5. `feat(admin): add product list and form with image upload`
6. `feat(admin): add category management`
7. `feat(admin): add order management`
8. `docs: add Phase 8 admin dashboard guide`

---

## Out of scope (later)
- Stripe payments (next phase) and deployment
- Dashboard analytics (sales totals, low-stock), pagination/search in admin tables
- Deleting Cloudinary images when a product/image is removed (the Phase 3 TODO)
- Role management UI (promoting users to admin) — for now flip `isAdmin` in Mongo
- A dedicated `GET /products/id/:id` admin endpoint (we reuse list/slug for now)
