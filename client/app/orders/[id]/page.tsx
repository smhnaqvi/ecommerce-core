"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";
import { getOrderById, type Order } from "@/lib/orderApi";
import { createCheckoutSession } from "@/lib/paymentApi";

const STATUS_STYLES: Record<Order["status"], string> = {
  awaiting_payment: "bg-[#8B5E3C]/10 text-[#8B5E3C]",
  pending: "bg-[#2C1A0E]/5 text-[#2C1A0E]/60",
  processing: "bg-[#8B5E3C]/10 text-[#8B5E3C]",
  shipped: "bg-[#2C1A0E]/10 text-[#2C1A0E]",
  delivered: "bg-emerald-600/10 text-emerald-700",
  cancelled: "bg-red-600/10 text-red-700",
};

// The webhook may land a moment after Stripe redirects back, so when we
// arrive with ?paid=1 and the order is still unpaid, refetch a few times.
const PAID_POLL_ATTEMPTS = 5;
const PAID_POLL_DELAY_MS = 2000;

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageShell><p className="font-sans text-sm text-[#2C1A0E]/50">Loading your order…</p></PageShell>}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      <div className="max-w-[1024px] mx-auto px-6 lg:px-12 py-10">{children}</div>
    </div>
  );
}

function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("paid") === "1";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function load() {
      try {
        const data = await getOrderById(id);
        if (cancelled) return;
        setOrder(data);
        setLoading(false);
        if (justPaid && !data.isPaid && attempts < PAID_POLL_ATTEMPTS) {
          attempts += 1;
          setTimeout(load, PAID_POLL_DELAY_MS);
        }
      } catch {
        if (cancelled) return;
        setError("Could not load this order. Are you logged in?");
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, justPaid]);

  async function handlePayNow() {
    if (!order) return;
    setPaying(true);
    try {
      const url = await createCheckoutSession(order._id);
      window.location.href = url;
    } catch {
      setError("Could not start the payment. Please try again.");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <p className="font-sans text-sm text-[#2C1A0E]/50">Loading your order…</p>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="bg-red-50 border border-red-200 px-4 py-3">
          <p className="font-sans text-sm text-red-600">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (!order) return null;

  const awaitingWebhook = justPaid && !order.isPaid;
  const needsPayment = order.paymentMethod === "STRIPE" && !order.isPaid;

  return (
    <PageShell>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] block mb-2">
            {order.isPaid || order.paymentMethod === "COD" ? "Thank you" : "One more step"}
          </span>
          <h1 className="font-serif text-4xl text-[#2C1A0E]">Order Details</h1>
          <p className="font-sans text-xs text-[#2C1A0E]/40 mt-2 tracking-wide">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1.5 ${STATUS_STYLES[order.status]}`}
        >
          {order.status.replace("_", " ")}
        </span>
      </div>

      {/* Payment banner */}
      {order.isPaid ? (
        <div className="flex items-center gap-3 border border-emerald-600/20 bg-emerald-600/5 px-5 py-4 mb-10">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <div>
            <p className="font-sans text-sm font-medium text-[#2C1A0E]">Payment successful</p>
            {order.paidAt && (
              <p className="font-sans text-xs text-[#2C1A0E]/50 mt-0.5">
                Paid on {new Date(order.paidAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      ) : awaitingWebhook ? (
        <div className="flex items-center gap-3 border border-[#8B5E3C]/25 bg-[#8B5E3C]/5 px-5 py-4 mb-10">
          <span className="w-4 h-4 border-2 border-[#8B5E3C]/30 border-t-[#8B5E3C] rounded-full animate-spin shrink-0" />
          <div>
            <p className="font-sans text-sm font-medium text-[#2C1A0E]">Confirming your payment…</p>
            <p className="font-sans text-xs text-[#2C1A0E]/50 mt-0.5">
              This usually takes a few seconds — the page will update automatically.
            </p>
          </div>
        </div>
      ) : needsPayment ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-[#8B5E3C]/25 bg-[#8B5E3C]/5 px-5 py-4 mb-10">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-[#8B5E3C] shrink-0" />
            <div>
              <p className="font-sans text-sm font-medium text-[#2C1A0E]">
                This order hasn’t been paid yet
              </p>
              <p className="font-sans text-xs text-[#2C1A0E]/50 mt-0.5">
                Complete the payment to start processing.
              </p>
            </div>
          </div>
          <button
            onClick={handlePayNow}
            disabled={paying}
            className="bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase px-8 py-3 flex items-center justify-center gap-2 hover:bg-[#8B5E3C] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paying ? (
              <>
                <span className="w-3 h-3 border border-[#F5EFE4]/40 border-t-[#F5EFE4] rounded-full animate-spin" />
                Redirecting…
              </>
            ) : (
              "Pay Now"
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 border border-[#2C1A0E]/15 px-5 py-4 mb-10">
          <Banknote size={18} className="text-[#2C1A0E]/50 shrink-0" />
          <p className="font-sans text-sm text-[#2C1A0E]/70">
            Cash on delivery — pay when your order arrives.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 xl:gap-16">
        {/* ── Left: items + address ─────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-full bg-[#2C1A0E] flex items-center justify-center shrink-0">
              <Package size={13} className="text-[#F5EFE4]" />
            </div>
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase text-[#2C1A0E]">
              Items
            </h2>
          </div>

          <ul className="divide-y divide-[#2C1A0E]/10 border-y border-[#2C1A0E]/10 mb-10">
            {order.items.map((item) => (
              <li key={item.product} className="flex items-center gap-4 py-4">
                <div className="relative w-16 h-20 overflow-hidden bg-[#E8DDD0] shrink-0">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm text-[#2C1A0E] leading-snug line-clamp-2">
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

          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-full bg-[#2C1A0E] flex items-center justify-center shrink-0">
              <MapPin size={13} className="text-[#F5EFE4]" />
            </div>
            <h2 className="font-sans text-sm font-medium tracking-widest uppercase text-[#2C1A0E]">
              Shipping Address
            </h2>
          </div>

          <div className="font-sans text-sm text-[#2C1A0E]/70 leading-relaxed">
            <p className="font-medium text-[#2C1A0E]">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.phone}</p>
            <p>{order.shippingAddress.address}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        </div>

        {/* ── Right: summary ────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-[#E8DDD0] p-6 sticky top-24">
            <h2 className="font-serif text-xl text-[#2C1A0E] mb-6">Summary</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="font-sans text-xs text-[#2C1A0E]/50">Items</span>
                <span className="font-sans text-xs text-[#2C1A0E]">
                  Rs. {order.itemsPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-xs text-[#2C1A0E]/50">Shipping</span>
                <span className="font-sans text-xs text-[#2C1A0E]">
                  {order.shippingPrice === 0 ? (
                    <span className="text-emerald-600">Free</span>
                  ) : (
                    `Rs. ${order.shippingPrice.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-xs text-[#2C1A0E]/50">Payment</span>
                <span className="font-sans text-xs text-[#2C1A0E]">
                  {order.paymentMethod === "STRIPE" ? "Card (Stripe)" : "Cash on Delivery"}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-[#2C1A0E]/10 mb-4" />

            <div className="flex justify-between items-baseline">
              <span className="font-sans text-sm font-medium text-[#2C1A0E]">Total</span>
              <span className="font-serif text-2xl text-[#2C1A0E]">
                Rs. {order.totalPrice.toLocaleString()}
              </span>
            </div>

            {order.isPaid && (
              <div className="mt-4 pt-4 border-t border-[#2C1A0E]/10 flex items-center justify-center gap-2">
                <ShieldCheck size={12} className="text-[#2C1A0E]/30" />
                <p className="font-sans text-[10px] text-[#2C1A0E]/30">
                  Paid securely via Stripe
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Link
        href="/orders"
        className="inline-flex items-center gap-2 font-sans text-xs tracking-widest uppercase text-[#2C1A0E]/60 hover:text-[#8B5E3C] transition-colors mt-12"
      >
        <ArrowLeft size={14} />
        Back to my orders
      </Link>
    </PageShell>
  );
}
