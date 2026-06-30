import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api";

export default function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: api.products.listProducts,
  });

  const del = useMutation({
    mutationFn: api.products.deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/products/new" className="rounded bg-black px-4 py-2 text-white">New product</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-2">Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p._id} className="border-b">
              <td className="p-2">{p.name}</td>
              <td>${p.price}</td>
              <td>{p.countInStock}</td>
              <td className="space-x-2 text-right">
                <Link to={`/products/${p._id}/edit`} className="underline">Edit</Link>
                <button onClick={() => del.mutate(p._id)} className="text-red-600 underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



