# Phase 5 — Cart & Checkout

## Context

Phases 1–4 gave us the backend (auth + catalog) and the storefront that lists and shows
products. Phase 5 lets a shopper **collect items in a cart**, fill an **address**, and place an
**order** that is persisted on the server. Payment is still out of scope here — every order in
this phase is **Cash on Delivery (COD)**; Stripe comes in Phase 6.

**Branch split (important):**

- **Server work** (Order model + API) → do it on `feature/server`.
- **Client work** (cart store, cart page, checkout) → do it on `feature/client`.

**Stack decisions locked in:** cart state in **Zustand with** `persist` **to localStorage**
(matches your existing `store/authStore.ts`) • address captured at checkout (not saved to the
User yet) • order totals are **recomputed on the server** from live product prices, never trusted
from the client.

**Mentoring style:** Explain → you write. One step at a time; run the verification before Phase 6.

---



## Part A — Server: Order model + API (`feature/server`)



### Files to create

```
server/src/
├── models/order.model.ts
├── controllers/order.controller.ts
└── routes/order.routes.ts        # mounted at /api/orders in app.ts
```



### Step A1 — Order model (`src/models/order.model.ts`)

**Concepts:**

- An order **snapshots** each line item (name, price, image, qty) at purchase time, so later
product edits don't rewrite order history.
- It **references** the buyer (`user`) and stores a shipping address sub-document.
- Status fields track the order lifecycle. For COD, `isPaid` stays false until delivery.

```ts
import mongoose, { Document, Schema, Types } from "mongoose";

interface OrderItem {
  product: Types.ObjectId;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "COD" | "STRIPE";
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: String,
        qty: { type: Number, required: true, min: 1 },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ["COD", "STRIPE"], default: "COD" },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
```



### Step A2 — Order controller (`src/controllers/order.controller.ts`)

**Concept — trust the server, not the client.** The client sends only `productId` + `qty` and the
address. The server looks up each product, uses its **current DB price**, rejects out-of-stock
items, and computes the totals. This prevents a tampered client from buying at a fake price.

```ts
import { Request, Response } from "express";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";

const SHIPPING_FLAT = 0; // free for v1; adjust later

export async function createOrder(req: Request, res: Response) {
  const { items, shippingAddress, paymentMethod } = req.body as {
    items: { product: string; qty: number }[];
    shippingAddress: IOrderAddress;
    paymentMethod?: "COD" | "STRIPE";
  };

  if (!items?.length) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  // Build line items from live product data.
  const lineItems = await Promise.all(
    items.map(async ({ product, qty }) => {
      const p = await Product.findById(product);
      if (!p || !p.isActive) {
        res.status(404);
        throw new Error(`Product not available: ${product}`);
      }
      if (qty < 1) {
        res.status(400);
        throw new Error("Invalid quantity");
      }
      return {
        product: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0],
        qty,
      };
    })
  );

  const itemsPrice = lineItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalPrice = itemsPrice + SHIPPING_FLAT;

  const order = await Order.create({
    user: req.user!.id,
    items: lineItems,
    shippingAddress,
    paymentMethod: paymentMethod ?? "COD",
    itemsPrice,
    shippingPrice: SHIPPING_FLAT,
    totalPrice,
  });

  res.status(201).json(order);
}

export async function getMyOrders(req: Request, res: Response) {
  const orders = await Order.find({ user: req.user!.id }).sort({ createdAt: -1 });
  res.json(orders);
}

export async function getOrderById(req: Request, res: Response) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  // Only the owner (or an admin) may view it.
  if (order.user.toString() !== req.user!.id && !req.user!.isAdmin) {
    res.status(403);
    throw new Error("Not allowed");
  }
  res.json(order);
}
```

> Define the `IOrderAddress` type inline or import the address shape; keep it consistent with the
> model. (You can also just type it as the `shippingAddress` interface above.)



### Step A3 — Routes (`src/routes/order.routes.ts`) + mount

```ts
import { Router } from "express";
import { protect } from "../middleware/protect";
import { createOrder, getMyOrders, getOrderById } from "../controllers/order.controller";

const router = Router();

router.use(protect); // every order route requires login
router.post("/", createOrder);
router.get("/mine", getMyOrders);
router.get("/:id", getOrderById);

export default router;
```

In `src/app.ts`, mount alongside the others:

```ts
import orderRouter from "./routes/order.routes";
app.use("/api/orders", orderRouter);
```



### Server verification (port 8800, admin/user cookie from Phase 2)

```bash
# create an order (use a real productId from /api/products)
curl -b cookies.txt -X POST http://localhost:8800/api/orders -H 'Content-Type: application/json' -d '{
  "items":[{"product":"6a42704938389e3b6f9e016d","qty":2}],
  "shippingAddress":{"fullName":"Sam","phone":"123","address":"1 St","city":"NYC","postalCode":"10001","country":"US"},
  "paymentMethod":"COD"
}'
curl -b cookies.txt http://localhost::8800/api/orders/mine     # -> array with your order
curl http://localhost:8800/api/orders/mine                     # -> 401 (no cookie)
```

Check: total equals server-computed `price*qty`, even if you send a bogus price in the body.

---



## Part B — Client: Cart + Checkout (`feature/client`)



### Files to create

```
client/
├── store/cartStore.ts                # Zustand + persist (localStorage)
├── app/cart/page.tsx                 # cart line items, qty controls, totals
├── app/checkout/page.tsx             # address form + place order (COD)
├── app/orders/page.tsx               # "My Orders" list
├── components/AddToCartButton.tsx    # used on product detail / cards
└── lib/orderApi.ts                   # createOrder / getMyOrders calls
```



### Step B1 — Cart store (`store/cartStore.ts`)

**Concept:** mirror your `authStore` pattern. Persist to localStorage so the cart survives
refreshes. Store the minimum per line (id, name, price, image, qty); never store derived totals —
compute them with selectors.

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (product: string) => void;
  setQty: (product: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product === item.product);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product === item.product ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),
      removeItem: (product) =>
        set((state) => ({ items: state.items.filter((i) => i.product !== product) })),
      setQty: (product, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product === product ? { ...i, qty: Math.max(1, qty) } : i
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart" } // localStorage key
  )
);

// derived total — use in components, don't store it
export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0);
```

> Next.js note: components that read the cart must be Client Components (`"use client"`).
> To avoid hydration mismatch from localStorage, read cart values after mount (e.g. an
> `isMounted` flag or `useEffect`), or gate rendering of cart counts until hydrated.



### Step B2 — Add to cart

`components/AddToCartButton.tsx`: a `"use client"` button that calls
`useCartStore().addItem({ product, name, price, image })`. Drop it into the product detail page
and/or `ProductCard`.

### Step B3 — Cart page (`app/cart/plib/orderApi.tsage.tsx`)

- List `items` with qty steppers (`setQty`), remove buttons, line subtotals.
- Show `cartTotal(items)`.
- "Proceed to checkout" → `/checkout` (redirect to `/login?redirect=/checkout` if not logged in —
read auth state from your `authStore`).



### Step B4 — Order API client (`lib/orderApi.ts`)

Reuse your existing `lib/api.ts` axios instance (it already sends `credentials`). Send only
`{ product, qty }` per item plus the address — **not** prices.

```ts
import { api } from "./api";
import type { CartItem } from "../store/cartStore";

export interface ShippingAddress {
  fullName: string; phone: string; address: string;
  city: string; postalCode: string; country: string;
}

export async function createOrder(items: CartItem[], shippingAddress: ShippingAddress) {
  const payload = {
    items: items.map((i) => ({ product: i.product, qty: i.qty })),
    shippingAddress,
    paymentMethod: "COD",
  };
  const { data } = await api.post("/orders", payload);
  return data;
}

export async function getMyOrders() {
  const { data } = await api.get("/orders/mine");
  return data;
}
```



### Step B5 — Checkout page (`app/checkout/page.tsx`)

- A controlled address form (the six fields above) with basic required validation.
- An order summary (items + `cartTotal`).
- On submit: `createOrder(items, address)` → on success `clear()` the cart and redirect to
`/orders` (or an order-confirmation page).
- Guard: if `items.length === 0`, redirect to `/cart`.



### Step B6 — My Orders page (`app/orders/page.tsx`)

- `"use client"`; on mount call `getMyOrders()` and render a list: date, total, status, item count.
- Empty state when there are no orders.



### Client verification

1. Add products to cart from the listing/detail pages → cart badge updates, survives refresh.
2. Change qty / remove on `/cart` → totals update; total matches sum of line items.
3. While logged out, "checkout" sends you to login, then back.
4. Submit checkout → network shows POST `/api/orders` with **no prices** in the body, response
  has server-computed `totalPrice`; cart clears; `/orders` shows the new order.

---



## Commit plan (your user, no Claude co-author)

**On** `feature/server`**:**

1. `feat(server): add Order model`
2. `feat(server): add order controller (create, my orders, get by id)`
3. `feat(server): mount order routes`

**On** `feature/client`**:**
4. `feat(client): add cart store with localStorage persistence`
5. `feat(client): add add-to-cart and cart page`
6. `feat(client): add order API client`
7. `feat(client): add checkout page with COD order placement`
8. `feat(client): add my-orders page`
9. `docs: add Phase 5 cart & checkout guide`

---



## Out of scope (later phases)

- Stripe payment + webhook (Phase 6) — `paymentMethod: "STRIPE"`, `isPaid` flips on webhook.
- Stock decrement on successful order/payment — note as a TODO; decide whether to reserve on
order or decrement on payment.
- Saved addresses on the User, order cancellation, admin order management (Phase 7).

```

```

