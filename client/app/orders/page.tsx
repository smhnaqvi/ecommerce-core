"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { getMyOrders, type Order } from "@/lib/orderApi";

const STATUS_STYLES: Record<Order["status"], string> = {
  awaiting_payment: "bg-[#8B5E3C]/10 text-[#8B5E3C]",
  pending: "bg-[#2C1A0E]/5 text-[#2C1A0E]/60",
  processing: "bg-[#8B5E3C]/10 text-[#8B5E3C]",
  shipped: "bg-[#2C1A0E]/10 text-[#2C1A0E]",
  delivered: "bg-emerald-600/10 text-emerald-700",
  cancelled: "bg-red-600/10 text-red-700",
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5EFE4]">
      <div className="max-w-[1024px] mx-auto px-6 lg:px-12 py-10">{children}</div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch(() => setError("Could not load your orders. Are you logged in?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageShell>
        <p className="font-sans text-sm text-[#2C1A0E]/50">Loading your orders…</p>
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

  if (orders.length === 0) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#2C1A0E]/5 flex items-center justify-center mx-auto mb-6">
            <Package size={20} className="text-[#2C1A0E]/40" />
          </div>
          <h1 className="font-serif text-3xl text-[#2C1A0E] mb-3">No orders yet</h1>
          <p className="font-sans text-sm text-[#2C1A0E]/50 mb-8">
            When you place an order, it’ll show up here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#8B5E3C] transition-colors duration-300"
          >
            Start Shopping
            <ArrowRight size={14} />
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Page header */}
      <div className="mb-10">
        <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] block mb-2">
          Your account
        </span>
        <h1 className="font-serif text-4xl text-[#2C1A0E]">My Orders</h1>
        <p className="font-sans text-xs text-[#2C1A0E]/40 mt-2 tracking-wide">
          {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="divide-y divide-[#2C1A0E]/10 border-y border-[#2C1A0E]/10">
        {orders.map((o) => {
          const itemCount = o.items.reduce((sum, i) => sum + i.qty, 0);
          return (
            <li key={o._id}>
              <Link
                href={`/orders/${o._id}`}
                className="group flex flex-wrap items-center gap-x-6 gap-y-3 py-5 px-2 -mx-2 hover:bg-[#2C1A0E]/[0.03] transition-colors"
              >
                <div className="flex-1 min-w-[160px]">
                  <p className="font-sans text-sm font-medium text-[#2C1A0E]">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="font-sans text-xs text-[#2C1A0E]/40 mt-1">
                    {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                    {o.paymentMethod === "STRIPE" ? "Card" : "Cash on Delivery"}
                  </p>
                </div>

                <span
                  className={`font-sans text-[10px] tracking-widest uppercase px-3 py-1.5 shrink-0 ${STATUS_STYLES[o.status]}`}
                >
                  {o.status.replace("_", " ")}
                </span>

                <p className="font-serif text-xl text-[#2C1A0E] shrink-0 w-32 text-right">
                  Rs. {o.totalPrice.toLocaleString()}
                </p>

                <ArrowRight
                  size={16}
                  className="text-[#2C1A0E]/25 group-hover:text-[#8B5E3C] group-hover:translate-x-0.5 transition-all shrink-0"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
