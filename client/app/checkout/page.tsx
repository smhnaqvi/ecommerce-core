"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, ArrowRight, MapPin, CreditCard, Banknote } from "lucide-react";
import { useCartStore, cartTotal } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { createOrder, type ShippingAddress } from "@/lib/orderApi";
import { createCheckoutSession } from "@/lib/paymentApi";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

type PaymentMethod = "COD" | "STRIPE";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

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
      // Step 1 — create order (COD or STRIPE)
      const order = await createOrder(items, address, paymentMethod);

      if (paymentMethod === "COD") {
        // COD flow — unchanged from before
        clear();
        router.push("/orders");
        return;
      }

      // STRIPE flow — clear cart first, then redirect
      // Cart is cleared before redirect because:
      // - Order is already persisted in DB
      // - If payment cancelled, retry from order page not cart
      clear();

      const stripeUrl = await createCheckoutSession(order._id);
      window.location.href = stripeUrl; // full page redirect to Stripe

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not place your order.";
      setError(message);
      setSubmitting(false);
    }
  }

  if (items.length === 0) return null;

  const subtotal = cartTotal(items);

  const fields: {
    key: keyof ShippingAddress;
    label: string;
    type?: string;
    placeholder?: string;
    half?: boolean;
  }[] = [
    { key: "fullName", label: "Full Name", placeholder: "Muhammad Ali" },
    { key: "phone", label: "Phone", type: "tel", placeholder: "+92 300 0000000" },
    { key: "address", label: "Street Address", placeholder: "House #, Street, Area" },
    { key: "city", label: "City", placeholder: "Lahore", half: true },
    { key: "postalCode", label: "Postal Code", placeholder: "54000", half: true },
    { key: "country", label: "Country", placeholder: "Pakistan" },
  ];

  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10">

        {/* Page header */}
        <div className="mb-10">
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] block mb-2">
            Almost there
          </span>
          <h1 className="font-serif text-4xl text-[#2C1A0E]">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 xl:gap-16">

          {/* ── Left: form ───────────────────────────────────────────── */}
          <div className="lg:col-span-3">

            {/* Shipping address */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-7 h-7 rounded-full bg-[#2C1A0E] flex items-center justify-center shrink-0">
                <MapPin size={13} className="text-[#F5EFE4]" />
              </div>
              <h2 className="font-sans text-sm font-medium tracking-widest uppercase text-[#2C1A0E]">
                Shipping Address
              </h2>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 px-4 py-3">
                <p className="font-sans text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {fields.map((f) => (
                  <div key={f.key} className={!f.half ? "sm:col-span-2" : "sm:col-span-1"}>
                    <label className="block font-sans text-xs tracking-wide uppercase text-[#2C1A0E]/50 mb-2">
                      {f.label}
                    </label>
                    <input
                      type={f.type ?? "text"}
                      required
                      placeholder={f.placeholder}
                      value={address[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      className="w-full bg-transparent border border-[#2C1A0E]/20 px-4 py-3 font-sans text-sm text-[#2C1A0E] placeholder:text-[#2C1A0E]/25 focus:outline-none focus:border-[#8B5E3C] transition-colors"
                    />
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#2C1A0E]/10 my-2" />

              {/* Payment method picker */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#2C1A0E] flex items-center justify-center shrink-0">
                    <CreditCard size={13} className="text-[#F5EFE4]" />
                  </div>
                  <h2 className="font-sans text-sm font-medium tracking-widest uppercase text-[#2C1A0E]">
                    Payment Method
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* COD option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("COD")}
                    className={`w-full flex items-center gap-3 px-4 py-4 border transition-colors ${
                      paymentMethod === "COD"
                        ? "border-[#8B5E3C] bg-[#8B5E3C]/5"
                        : "border-[#2C1A0E]/15 hover:border-[#2C1A0E]/30"
                    }`}
                  >
                    {/* Radio indicator */}
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "COD" ? "border-[#8B5E3C]" : "border-[#2C1A0E]/30"
                    }`}>
                      {paymentMethod === "COD" && (
                        <div className="w-2 h-2 rounded-full bg-[#8B5E3C]" />
                      )}
                    </div>
                    <Banknote size={18} className="text-[#2C1A0E]/50 shrink-0" />
                    <div className="text-left">
                      <p className="font-sans text-sm font-medium text-[#2C1A0E]">
                        Cash on Delivery
                      </p>
                      <p className="font-sans text-xs text-[#2C1A0E]/50 mt-0.5">
                        Pay when your order arrives
                      </p>
                    </div>
                  </button>

                  {/* Stripe option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("STRIPE")}
                    className={`w-full flex items-center gap-3 px-4 py-4 border transition-colors ${
                      paymentMethod === "STRIPE"
                        ? "border-[#8B5E3C] bg-[#8B5E3C]/5"
                        : "border-[#2C1A0E]/15 hover:border-[#2C1A0E]/30"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      paymentMethod === "STRIPE" ? "border-[#8B5E3C]" : "border-[#2C1A0E]/30"
                    }`}>
                      {paymentMethod === "STRIPE" && (
                        <div className="w-2 h-2 rounded-full bg-[#8B5E3C]" />
                      )}
                    </div>
                    <CreditCard size={18} className="text-[#2C1A0E]/50 shrink-0" />
                    <div className="text-left flex-1">
                      <p className="font-sans text-sm font-medium text-[#2C1A0E]">
                        Pay by Card
                      </p>
                      <p className="font-sans text-xs text-[#2C1A0E]/50 mt-0.5">
                        Visa, Mastercard, Apple Pay, Google Pay
                      </p>
                    </div>
                    {/* Card logos */}
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      <div className="bg-[#2C1A0E]/5 px-2 py-1">
                        <span className="font-sans text-[9px] tracking-widest text-[#2C1A0E]/50 font-medium">VISA</span>
                      </div>
                      <div className="bg-[#2C1A0E]/5 px-1.5 py-1 flex items-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-400/60" />
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-400/60 -ml-1.5" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase py-4 flex items-center justify-center gap-2 hover:bg-[#8B5E3C] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border border-[#F5EFE4]/40 border-t-[#F5EFE4] rounded-full animate-spin" />
                    {paymentMethod === "STRIPE" ? "Redirecting to Stripe…" : "Placing order…"}
                  </>
                ) : (
                  <>
                    {paymentMethod === "STRIPE" ? "Continue to Payment" : "Place Order"}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <ShieldCheck size={13} className="text-[#2C1A0E]/30" />
                <p className="font-sans text-[10px] text-[#2C1A0E]/30 tracking-wide">
                  {paymentMethod === "STRIPE"
                    ? "You'll be redirected to Stripe — charged in USD at the current exchange rate"
                    : "Your information is encrypted and secure"}
                </p>
              </div>
            </form>
          </div>

          {/* ── Right: order summary ──────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-[#E8DDD0] p-6 sticky top-24">
              <h2 className="font-serif text-xl text-[#2C1A0E] mb-6">
                Order Summary
              </h2>

              <ul className="space-y-4 mb-6">
                {items.map((item) => (
                  <li key={item.product._id} className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="relative w-16 h-20 overflow-hidden bg-[#F5EFE4]">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#E8DDD0]" />
                        )}
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2C1A0E] text-[#F5EFE4] font-sans text-[10px] flex items-center justify-center">
                        {item.qty}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-xs text-[#2C1A0E] leading-snug line-clamp-2">
                        {item.name}
                      </p>
                      <p className="font-sans text-xs text-[#2C1A0E]/40 mt-1">
                        Rs. {item.price.toLocaleString()} × {item.qty}
                      </p>
                    </div>
                    <p className="font-sans text-sm font-medium text-[#2C1A0E] shrink-0">
                      Rs. {(item.price * item.qty).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="w-full h-px bg-[#2C1A0E]/10 mb-4" />

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="font-sans text-xs text-[#2C1A0E]/50">Subtotal</span>
                  <span className="font-sans text-xs text-[#2C1A0E]">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-xs text-[#2C1A0E]/50">Shipping</span>
                  <span className="font-sans text-xs text-[#2C1A0E]">
                    {subtotal >= 5000 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      "Calculated at checkout"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-xs text-[#2C1A0E]/50">Payment</span>
                  <span className="font-sans text-xs text-[#2C1A0E]">
                    {paymentMethod === "STRIPE" ? "Card (Stripe)" : "Cash on Delivery"}
                  </span>
                </div>
              </div>

              <div className="w-full h-px bg-[#2C1A0E]/10 mb-4" />

              <div className="flex justify-between items-baseline">
                <span className="font-sans text-sm font-medium text-[#2C1A0E]">Total</span>
                <span className="font-serif text-2xl text-[#2C1A0E]">
                  Rs. {subtotal.toLocaleString()}
                </span>
              </div>

              {/* Stripe badge when card selected */}
              {paymentMethod === "STRIPE" && (
                <div className="mt-4 pt-4 border-t border-[#2C1A0E]/10 flex items-center justify-center gap-2">
                  <ShieldCheck size={12} className="text-[#2C1A0E]/30" />
                  <p className="font-sans text-[10px] text-[#2C1A0E]/30">
                    Powered by Stripe — PCI DSS compliant
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}