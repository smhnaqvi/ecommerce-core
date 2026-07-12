import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not defined in .env");
  process.exit(1);
}

export const stripe = new Stripe(key, {
  apiVersion: "2026-06-24.dahlia" // apiVersion: "2025-05-28.basil",
});

// All Stripe amounts are in the smallest currency unit (cents for USD).
// Keep the math in one place — never inline this.
export const CURRENCY = "usd";
export const toMinorUnits = (price: number): number => Math.round(price * 100);