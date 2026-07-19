import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import type { Order } from "../types/order.type";

const statuses = [
  "awaiting_payment",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// Prices are stored in PKR.
const money = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

// Strip formatting so the dialled number is always valid.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// Customers type local numbers ("0300-1234567"), but wa.me needs full
// international digits with no plus or separators ("923001234567").
const DEFAULT_DIAL_CODE = "92"; // Pakistan

function toWhatsappNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2); // 0092… → 92…
  if (digits.startsWith("0")) {
    // Local format: swap the trunk prefix for the country code.
    digits = DEFAULT_DIAL_CODE + digits.slice(1);
  } else if (digits.length <= 10) {
    // Bare subscriber number, no trunk prefix and no country code.
    digits = DEFAULT_DIAL_CODE + digits;
  }

  // Shorter than this cannot be a real international number.
  return digits.length >= 10 ? digits : null;
}

function confirmationMessage(o: Order): string {
  const ref = o._id.slice(-6).toUpperCase();
  const items = o.items.map((i) => `• ${i.qty} × ${i.name}`).join("\n");
  const ship = o.shippingAddress;
  // Customers often type the city into the address line too, so only append
  // it when it isn't already there.
  const address = ship?.address?.trim();
  const city = ship?.city?.trim();
  const cityIsRedundant =
    !city || (address?.toLowerCase().includes(city.toLowerCase()) ?? false);
  const where = [address, cityIsRedundant ? "" : city]
    .filter(Boolean)
    .join(", ");

  return [
    `Assalam o Alaikum ${ship?.fullName ?? ""}`.trim() + ",",
    "",
    `We received your order (#${ref}) and would like to confirm it before dispatch.`,
    "",
    items,
    "",
    `Total: ${money(o.totalPrice)} (Cash on Delivery)`,
    where ? `Delivery address: ${where}` : "",
    "",
    "Please reply to confirm these details are correct. Thank you!",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function whatsappHref(o: Order): string | null {
  const number = toWhatsappNumber(o.shippingAddress?.phone ?? "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(
    confirmationMessage(o)
  )}`;
}

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// How long ago the order came in, so unconfirmed COD orders that have been
// sitting for days are obvious at a glance.
const AGE_UNITS: [limit: number, per: number, name: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, "second"],
  [3600, 60, "minute"],
  [86400, 3600, "hour"],
  [2592000, 86400, "day"],
  [31536000, 2592000, "month"],
  [Infinity, 31536000, "year"],
];

function age(iso: string) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  // Clocks can disagree; treat a near-future timestamp as "just now".
  if (seconds < 45) return "just now";

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const [, per, unit] = AGE_UNITS.find(([limit]) => seconds < limit)!;
  return rtf.format(-Math.round(seconds / per), unit);
}

export default function Orders() {
  const qc = useQueryClient();
  const [source, setSource] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", source],
    queryFn: () => api.orders.listAllOrders(source || undefined),
  });

  const { data: sources } = useQuery<string[]>({
    queryKey: ["order-sources"],
    queryFn: () => api.orders.listOrderSources(),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.orders.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>

        <label className="text-sm">
          <span className="mr-2 text-gray-600">Source</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1"
          >
            <option value="">All orders</option>
            {sources?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left align-bottom">
            <th className="p-2">Customer</th>
            <th className="p-2">Deliver to</th>
            <th className="p-2">Items</th>
            <th className="p-2">Total</th>
            <th className="p-2">Date</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o: Order) => {
            const ship = o.shippingAddress;
            // Guest orders carry their contact details on the order itself,
            // since there is no account behind them.
            const email = o.user?.email ?? o.guestEmail;
            const waHref = whatsappHref(o);

            return (
              <tr key={o._id} className="border-b align-top">
                <td className="p-2">
                  <div className="font-medium">
                    {ship?.fullName ?? o.user?.name ?? "—"}
                  </div>
                  {ship?.phone && (
                    <a
                      href={telHref(ship.phone)}
                      className="block text-blue-600 underline"
                    >
                      {ship.phone}
                    </a>
                  )}
                  {email && (
                    <div className="text-xs text-gray-500">{email}</div>
                  )}
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                      title="Open WhatsApp with a prefilled confirmation message"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.24-8.24 8.24z" />
                      </svg>
                      Confirm on WhatsApp
                    </a>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {o.source && o.source !== "web" && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                        {o.source}
                      </span>
                    )}
                    {o.isGuest && (
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">
                        Guest
                      </span>
                    )}
                  </div>
                </td>

                <td className="max-w-xs p-2">
                  <div>{ship?.address ?? "—"}</div>
                  <div className="text-gray-600">
                    {[ship?.city, ship?.postalCode, ship?.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </td>

                <td className="p-2">
                  {o.items.map((it, i) => (
                    <div key={i}>
                      {it.qty} × {it.name}
                    </div>
                  ))}
                </td>

                <td className="whitespace-nowrap p-2">
                  <div>{money(o.totalPrice)}</div>
                  <div className="text-xs text-gray-500">
                    {o.paymentMethod ?? "COD"}
                    {o.isPaid ? " · paid" : " · unpaid"}
                  </div>
                </td>

                <td className="whitespace-nowrap p-2">
                  <div>{dateTime(o.createdAt)}</div>
                  <div className="text-xs text-gray-500">
                    {age(o.createdAt)}
                  </div>
                </td>

                <td className="p-2">
                  <select
                    value={o.status}
                    onChange={(e) =>
                      setStatus.mutate({ id: o._id, status: e.target.value })
                    }
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {orders?.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No orders yet.</p>
      )}
    </div>
  );
}
