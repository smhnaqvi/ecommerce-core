"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCartStore, cartTotal } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { createOrder, type ShippingAddress } from "@/lib/orderApi";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Guard: empty cart -> back to cart.
  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

  // Guard: must be logged in to place an order.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/checkout");
  }, [authLoading, user, router]);

  function update(field: keyof ShippingAddress, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createOrder(items, address);
      clear();
      router.push("/orders");
    } catch {
      setError("Could not place your order. Please try again.");
      setSubmitting(false);
    }
  }

  // Avoid a flash of the form before the empty-cart guard redirects.
  if (items.length === 0) return null;

  const fields: { key: keyof ShippingAddress; label: string; type?: string }[] = [
    { key: "fullName", label: "Full name" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "postalCode", label: "Postal code" },
    { key: "country", label: "Country" },
  ];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Address form */}
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="text-2xl font-bold">Shipping address</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium">{f.label}</label>
            <input
              type={f.type ?? "text"}
              required
              value={address[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-40"
        >
          {submitting ? "Placing order…" : "Place order (Cash on delivery)"}
        </button>
      </form>

      {/* Order summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Order summary</h2>
        <ul className="divide-y rounded border">
          {items.map((i) => (
            <li key={i.product._id} className="flex items-center gap-3 p-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                {i.image && (
                  <Image src={i.image} alt={i.name} fill className="object-cover" sizes="56px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.name}</p>
                <p className="text-sm text-gray-500">
                  {i.qty} × ${i.price}
                </p>
              </div>
              <p className="text-sm font-medium">${(i.price * i.qty).toFixed(2)}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
          <span>Total</span>
          <span>${cartTotal(items).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
