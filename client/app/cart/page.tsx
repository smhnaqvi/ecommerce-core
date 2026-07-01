"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { useCartStore, cartTotal } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

const noopSubscribe = () => () => {};
function useIsServer() {
  return useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true
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

  const subtotal = cartTotal(items);
  const freeShippingThreshold = 5000;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E8DDD0] flex items-center justify-center mb-6">
          <ShoppingBag size={28} className="text-[#8B5E3C]" />
        </div>
        <h1 className="font-serif text-3xl text-[#2C1A0E] mb-3">
          Your cart is empty
        </h1>
        <p className="font-sans text-sm text-[#2C1A0E]/50 mb-8 max-w-xs">
          Looks like you haven&apos;t added anything yet. Explore our latest collection.
        </p>
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#8B5E3C] transition-colors duration-300"
        >
          Shop Collection
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // ── Cart with items ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10">

        {/* Page header */}
        <div className="mb-8">
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] block mb-2">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
          <h1 className="font-serif text-4xl text-[#2C1A0E]">Your Cart</h1>
        </div>

        {/* Free shipping progress bar */}
        {remainingForFreeShipping > 0 ? (
          <div className="mb-8 bg-[#E8DDD0] px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-[#8B5E3C]" />
              <p className="font-sans text-xs text-[#2C1A0E]/70">
                Add{" "}
                <span className="font-medium text-[#2C1A0E]">
                  Rs. {remainingForFreeShipping.toLocaleString()}
                </span>{" "}
                more for free delivery
              </p>
            </div>
            <div className="w-full h-1 bg-[#2C1A0E]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8B5E3C] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-8 bg-[#E8DDD0] px-5 py-4 flex items-center gap-2">
            <Truck size={14} className="text-emerald-600" />
            <p className="font-sans text-xs text-emerald-700 font-medium">
              You&apos;ve unlocked free delivery!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">

          {/* ── Line items ────────────────────────────────────────────── */}
          <ul className="lg:col-span-2 space-y-0 divide-y divide-[#2C1A0E]/10 border-t border-b border-[#2C1A0E]/10">
            {items.map((item) => (
              <li
                key={item.product._id}
                className="flex items-start gap-4 py-6"
              >
                {/* Product image */}
                <Link
                  href={`/product/${item.product.slug ?? item.product._id}`}
                  className="relative shrink-0 w-24 h-28 overflow-hidden bg-[#E8DDD0]"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E8DDD0]" />
                  )}
                </Link>

                {/* Product details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <Link
                      href={`/product/${item.product.slug ?? item.product._id}`}
                      className="font-sans text-sm font-medium text-[#2C1A0E] leading-snug hover:text-[#8B5E3C] transition-colors line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    {/* Remove button */}
                    <button
                      onClick={() => removeItem(item.product)}
                      aria-label="Remove item"
                      className="shrink-0 text-[#2C1A0E]/30 hover:text-[#2C1A0E] transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="font-sans text-xs text-[#2C1A0E]/40 mt-1">
                    Rs. {item.price.toLocaleString()} each
                  </p>

                  {/* Qty + line total */}
                  <div className="flex items-center justify-between mt-4">
                    {/* Qty stepper */}
                    <div className="flex items-center border border-[#2C1A0E]/20">
                      <button
                        onClick={() => setQty(item.product, item.qty - 1)}
                        disabled={item.qty <= 1}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#2C1A0E]/60 hover:text-[#2C1A0E] disabled:opacity-30 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-10 text-center font-sans text-sm text-[#2C1A0E]">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => setQty(item.product, item.qty + 1)}
                        aria-label="Increase quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#2C1A0E]/60 hover:text-[#2C1A0E] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Line total */}
                    <p className="font-sans text-sm font-medium text-[#2C1A0E]">
                      Rs. {(item.price * item.qty).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* ── Order summary ─────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-[#E8DDD0] p-6 sticky top-24">
              <h2 className="font-serif text-xl text-[#2C1A0E] mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="font-sans text-sm text-[#2C1A0E]/60">
                    Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
                  </span>
                  <span className="font-sans text-sm text-[#2C1A0E]">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-sm text-[#2C1A0E]/60">
                    Shipping
                  </span>
                  <span className="font-sans text-sm text-[#2C1A0E]">
                    {subtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      "Calculated at checkout"
                    )}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#2C1A0E]/10 mb-6" />

              {/* Total */}
              <div className="flex justify-between items-baseline mb-8">
                <span className="font-sans text-sm font-medium text-[#2C1A0E]">
                  Total
                </span>
                <span className="font-serif text-2xl text-[#2C1A0E]">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={goToCheckout}
                className="w-full bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase py-4 flex items-center justify-center gap-2 hover:bg-[#8B5E3C] transition-colors duration-300"
              >
                Proceed to Checkout
                <ArrowRight size={14} />
              </button>

              {/* Continue shopping */}
              <Link
                href="/collections"
                className="block text-center font-sans text-xs text-[#2C1A0E]/40 hover:text-[#8B5E3C] mt-4 transition-colors tracking-wide"
              >
                ← Continue shopping
              </Link>

              {/* Trust signals */}
              <div className="mt-6 pt-6 border-t border-[#2C1A0E]/10 space-y-2">
                {[
                  "SSL encrypted & secure checkout",
                  "7-day hassle-free returns",
                  "Cash on delivery available",
                ].map((text) => (
                  <p key={text} className="font-sans text-[10px] text-[#2C1A0E]/40 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#8B5E3C] shrink-0" />
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}