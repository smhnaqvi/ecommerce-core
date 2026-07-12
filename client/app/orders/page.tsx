"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyOrders, type Order } from "@/lib/orderApi";

const STATUS_STYLES: Record<Order["status"], string> = {
  awaiting_payment: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

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

  if (loading) return <p>Loading your orders…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  if (orders.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold">No orders yet</h1>
        <p className="text-gray-500">When you place an order, it’ll show up here.</p>
        <Link href="/" className="inline-block rounded bg-black px-5 py-2 text-white">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      <ul className="space-y-3">
        {orders.map((o) => {
          const itemCount = o.items.reduce((sum, i) => sum + i.qty, 0);
          return (
            <li key={o._id}>
              <Link
                href={`/orders/${o._id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded border p-4 hover:bg-gray-50"
              >
              <div>
                <p className="font-medium">
                  {new Date(o.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[o.status]}`}
              >
                {o.status.replace("_", " ")}
              </span>
              <p className="text-lg font-bold">${o.totalPrice.toFixed(2)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
