import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import type { Order } from "../types/order.type";

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const qc = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: api.orders.listAllOrders,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.orders.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Customer</th>
            <th className="p-2">Total</th>
            <th className="p-2">Date</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o: Order) => (
            <tr key={o._id} className="border-b">
              <td className="p-2">{o.user?.email ?? "Guest"}</td>
              <td className="p-2">${o.totalPrice}</td>
              <td className="p-2">
                {new Date(o.createdAt).toLocaleDateString()}
              </td>
              <td className="p-2">
                <select
                  value={o.status}
                  onChange={(e) =>
                    setStatus.mutate({ id: o._id, status: e.target.value })
                  }
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}