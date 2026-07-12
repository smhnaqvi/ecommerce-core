// PKR → USD conversion for Stripe (Stripe does not support PKR).
// The site displays PKR everywhere; conversion happens only here, on the
// server, at the moment a Checkout Session is created.

const RATE_TTL_MS = 60 * 60 * 1000; // refresh the live rate hourly

let cached: { rate: number; fetchedAt: number } | null = null;

/**
 * How many PKR one USD buys. Live rate from open.er-api.com, cached for
 * an hour. Falls back to the stale cache, then EXCHANGE_RATE_PKR_PER_USD.
 */
export async function getPkrPerUsd(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < RATE_TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error(`Rate API responded ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.PKR;
    if (typeof rate !== "number" || rate <= 0) {
      throw new Error("Rate API returned no PKR rate");
    }
    cached = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    if (cached) return cached.rate; // stale is better than none

    const fallback = Number(process.env.EXCHANGE_RATE_PKR_PER_USD);
    if (fallback > 0) return fallback;

    throw new Error(
      "Could not determine PKR→USD rate and EXCHANGE_RATE_PKR_PER_USD is not set"
    );
  }
}

/** Convert a PKR amount to USD cents at the given rate. */
export const pkrToUsdCents = (pkr: number, pkrPerUsd: number): number =>
  Math.round((pkr / pkrPerUsd) * 100);
