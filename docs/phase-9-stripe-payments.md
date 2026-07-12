# Phase 9 — Stripe Payments

## Context

Phases 1–8 gave us the full store: catalog, cart, checkout, orders (COD only), and the admin
panel. Phase 9 adds **online payment with Stripe**. The Order model is already prepared for
this — `paymentMethod: "COD" | "STRIPE"`, `isPaid`, and `paidAt` exist since Phase 5 — so this
phase is about wiring Stripe into the existing checkout flow, not reshaping the data model.

**Approach decision: Stripe Checkout (hosted page), not Elements.**

- **Stripe Checkout** redirects the shopper to a Stripe-hosted payment page and redirects back
when done. Stripe handles the card form, 3D Secure, Apple/Google Pay, and PCI compliance.
- **Elements** embeds the card form in our own page — more control, much more code (client SDK,
PaymentIntents lifecycle, confirmation handling).

For v1 we use **Checkout Sessions**. It's the least code, the hardest to get wrong, and easy to
swap for Elements later because the server-side source of truth (the webhook) is the same.

**The one rule that matters:** an order is marked paid **only by the Stripe webhook**, never by
the client redirect. A shopper can close the tab after paying (redirect never fires), or hit the
success URL without paying (URL is guessable). The webhook is the only trusted signal.

**Branch split (important):**

- **Server work** (Stripe SDK, checkout session endpoint, webhook) → `feature/server`.
- **Client work** (payment method picker, redirect handling, result pages) → `feature/client`.

**Stack decisions locked in:** `stripe` npm package on the server only (no Stripe JS on the
client — a hosted Checkout redirect is just a URL) • amounts sent to Stripe are **recomputed on
the server** from live product prices, same rule as Phase 5 • currency lives in one config
constant • webhook secret verified with `stripe.webhooks.constructEvent`.

**Mentoring style:** Explain → you write. One step at a time; run the verification before merging.

---



## Prerequisites (one-time setup)

1. Create a Stripe account (test mode is free, no business details needed).
2. From the Stripe Dashboard → Developers → API keys, grab the **test** keys.
3. Install the **Stripe CLI** (`brew install stripe/stripe-cli/stripe`) — it forwards webhooks
  to localhost during development.

New environment variables:

```
# server/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # printed by `stripe listen`, see verification
CLIENT_URL=http://localhost:3000  # used to build success/cancel redirect URLs
```

The **publishable** key is not needed for hosted Checkout — only the secret key, and it must
never reach the client bundle.

---



## Part A — Server: checkout session + webhook (`feature/server`)



### Files to create / touch

```
server/src/
├── config/stripe.ts                    # NEW — Stripe client instance + currency constant
├── controllers/payment.controller.ts   # NEW — createCheckoutSession, stripeWebhook
├── routes/payment.routes.ts            # NEW — mounted at /api/payments in app.ts
├── controllers/order.controller.ts     # TOUCH — createOrder accepts paymentMethod
└── app.ts                              # TOUCH — raw body for webhook route (see A4)
```

Install: `npm i stripe` (types are bundled).

### Step A1 — Stripe config (`src/config/stripe.ts`)

**Concepts:**

- One shared Stripe client, created from `STRIPE_SECRET_KEY`, exported like your existing config
modules. Fail fast at startup if the key is missing.
- Export `CURRENCY = "usd"` (or your currency) from here so the amount math and the Checkout
session always agree.
- Stripe amounts are in the **smallest currency unit** (cents). Write a single helper
`toMinorUnits(price: number): number` (`Math.round(price * 100)`) and use it everywhere —
rounding bugs come from doing this inline in two places.



### Step A2 — Order creation supports STRIPE (`order.controller.ts`)

**Concepts:**

- `createOrder` currently defaults every order to COD. Accept `paymentMethod` from the request
body, validated against `["COD", "STRIPE"]`.
- A STRIPE order is created with `isPaid: false` and `status: "pending"`, exactly like COD — the
difference is only what happens next (Part A3). **Do not** create the Stripe session inside
`createOrder`; keep order creation and payment initiation as two endpoints. If session
creation fails, the order still exists and payment can be retried.
- Recommended: add `"awaiting_payment"` to the order status enum, set it for STRIPE orders, and
have the webhook move them to `"processing"`. This keeps unpaid Stripe orders out of the admin
fulfilment queue. (If you skip this, filter on `isPaid` in the admin list instead.)



### Step A3 — Create Checkout Session (`payment.controller.ts`)

`POST /api/payments/checkout-session` (protected) — body: `{ orderId }`.

**Concepts:**

- Load the order, verify it belongs to `req.user`, is `paymentMethod: "STRIPE"`, and is not
already paid (each check → early `res.status(...)` return, matching your controller style).
- Build `line_items` from the order's **snapshotted** items (name, price, qty) — never from the
client body. Add shipping as its own line item if `shippingPrice > 0`.
- Create the session with:
  - `mode: "payment"`
  - `metadata: { orderId: order.id }` ← this is how the webhook finds the order; it is the
  load-bearing line of the whole phase.
  - `success_url: ${CLIENT_URL}/orders/${order.id}?paid=1`
  - `cancel_url: ${CLIENT_URL}/checkout?cancelled=1`
- Respond `{ url: session.url }`. The client just redirects to it — no Stripe JS needed.



### Step A4 — Webhook (`payment.controller.ts` + `app.ts`)

`POST /api/payments/webhook` — **public** (Stripe calls it; auth is the signature check).

**Concepts:**

- Signature verification needs the **raw request body**. Your global `express.json()` will have
already parsed (and thus destroyed) it, so in `app.ts` mount this one route with
`express.raw({ type: "application/json" })` **before** the JSON middleware:
  ```ts
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook
  );
  app.use(express.json()); // everything else, as before
  ```
- In the handler: `stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET)` — a throw here means forged/misconfigured, respond 400.
- Handle `checkout.session.completed`: read `session.metadata.orderId`, load the order, set
`isPaid = true`, `paidAt = new Date()`, `status = "processing"`, save.
- **Idempotency:** Stripe retries webhooks. If the order is already `isPaid`, return 200 and do
nothing. Never throw for "already done".
- Return 200 fast for events you don't handle — otherwise Stripe keeps retrying them.
- Optional but nice: store `session.payment_intent` on the order (add an optional
`paymentResult` field to the schema) so refunds are traceable later.



### Step A5 — Routes (`payment.routes.ts`)

```
POST /api/payments/checkout-session   protect
(webhook is mounted directly in app.ts — see A4, it must skip express.json)
```

---



## Part B — Client: payment picker + redirect flow (`feature/client`)



### Files to touch

```
client/app/checkout/…      # payment method radio (COD | Card), submit flow
client/app/orders/[id]/…   # paid/unpaid state, "Pay now" retry button
client/lib or store        # api helper for POST /api/payments/checkout-session
```



### Step B1 — Payment method choice at checkout

**Concepts:**

- Add a radio group: **Cash on Delivery** / **Pay by card (Stripe)**. Include the chosen value
as `paymentMethod` in the existing create-order request.
- Flow for COD is unchanged: create order → clear cart → go to order page.
- Flow for STRIPE: create order → call `POST /api/payments/checkout-session` with the new
order's id → `window.location.href = url`. Clear the cart **before** redirecting (the order
is already persisted; if payment fails the shopper retries from the order page, not the cart).



### Step B2 — Return pages

**Concepts:**

- **Success** (`/orders/[id]?paid=1`): show "Payment processing…" and treat the order's real
`isPaid` from the API as the truth — the webhook may land a second or two after the redirect.
Simplest v1: refetch the order once after a short delay, or offer a refresh. Do **not** render
"Payment confirmed" off the query param alone.
- **Cancel** (`/checkout?cancelled=1`): show a "payment cancelled" notice. The order exists but
is unpaid — the order detail page should show a **"Pay now"** button for any of the shopper's
own orders where `paymentMethod === "STRIPE" && !isPaid`, which calls the checkout-session
endpoint again and redirects. This one button is the whole retry story.



### Step B3 — Order UI states

- Order detail + order list: show a Paid / Awaiting payment badge from `isPaid` (and `paidAt`).
- Admin orders table (Phase 8): surface `isPaid` so unpaid Stripe orders aren't fulfilled.

---



## Verification (before merging)

1. Terminal 1: `npm run dev` (server) • Terminal 2: `npm run dev` (client) • Terminal 3:
  `stripe listen --forward-to localhost:<PORT>/api/payments/webhook` — copy the printed
   `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart the server.
2. **COD regression:** place a COD order — flow must be byte-for-byte what it was.
3. **Happy path:** checkout with card, pay with test card `4242 4242 4242 4242` (any future
  expiry, any CVC). Confirm: redirect to order page → webhook logs `checkout.session.completed`
   → order shows Paid in the UI and `isPaid: true`, `paidAt` set in Mongo.
4. **Cancel path:** start payment, click back/cancel on Stripe's page. Order exists, unpaid,
  "Pay now" appears on the order page and works.
5. **Decline path:** card `4000 0000 0000 0002` — payment fails on Stripe's page, order stays
  unpaid, retry works.
6. **Webhook is the authority:** visit `/orders/<id>?paid=1` for an unpaid order by hand — the
  UI must *not* claim it's paid.
7. **Forged webhook:** `curl -X POST localhost:<PORT>/api/payments/webhook -d '{}'` → 400.
8. **Idempotency:** `stripe events resend <event-id>` for the completed event → 200, order
  unchanged, no crash.

---



## Out of scope (v2 candidates)

- Refunds from the admin panel (needs stored `payment_intent` — see A4).
- `checkout.session.expired` handling to auto-cancel stale unpaid orders.
- Stock decrement on payment (decide: reserve at order time vs. decrement in webhook).
- Elements-based embedded card form, saved cards, subscriptions.

