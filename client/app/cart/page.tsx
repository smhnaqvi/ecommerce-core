"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCartStore, cartTotal } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

// Returns true during SSR + the first hydration render, false thereafter — without a
// setState-in-effect. The cart lives in localStorage, so we render it only on the client.
const noopSubscribe = () => () => {};
function useIsServer() {
  return useSyncExternalStore(
    noopSubscribe,
    () => false, // client snapshot
    () => true // server snapshot
  );
}

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const user = useAuthStore((s) => s.user);

  const isServer = useIsServer();

  function goToCheckout() {
    if (user) router.push("/checkout");
    else router.push("/login?redirect=/checkout");
  }

  if (isServer) return null;

  if (items.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/" className="inline-block rounded bg-black px-5 py-2 text-white">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {/* Line items */}
      <ul className="divide-y rounded border md:col-span-2">
        {items.map((i) => (
          <li key={i.product} className="flex items-center gap-4 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-gray-100">
              {i.image && (
                <Image src={i.image} alt={i.name} fill className="object-cover" sizes="80px" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{i.name}</p>
              <p className="text-sm text-gray-500">${i.price.toFixed(2)} each</p>

              {/* qty stepper */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setQty(i.product, i.qty - 1)}
                  disabled={i.qty <= 1}
                  aria-label="Decrease quantity"
                  className="h-7 w-7 rounded border disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{i.qty}</span>
                <button
                  onClick={() => setQty(i.product, i.qty + 1)}
                  aria-label="Increase quantity"
                  className="h-7 w-7 rounded border"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="font-medium">${(i.price * i.qty).toFixed(2)}</p>
              <button
                onClick={() => removeItem(i.product)}
                className="text-sm text-red-600 underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary */}
      <div className="h-fit space-y-4 rounded border p-4">
        <h2 className="text-lg font-bold">Summary</h2>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">${cartTotal(items).toFixed(2)}</span>
        </div>
        <p className="text-xs text-gray-500">Shipping calculated at checkout.</p>
        <button
          onClick={goToCheckout}
          className="w-full rounded bg-black py-2 text-white"
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
