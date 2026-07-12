const API = process.env.NEXT_PUBLIC_API_URL;

export async function createCheckoutSession(orderId: string): Promise<string> {
  const res = await fetch(`${API}/payments/checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Failed to create checkout session");
  }

  const data = await res.json();
  return data.url; // Stripe hosted page URL
}