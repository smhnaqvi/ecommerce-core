import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

interface Category { _id: string; name: string; }
type ApiError = { response?: { data?: { message?: string } } };

export default function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const create = useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    },
    onError: (err: ApiError) => {
      setError(err?.response?.data?.message ?? "Failed to create category");
    },
  });

  const del = useMutation({
    mutationFn: api.categories.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    create.mutate({ name });
  }

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Categories</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
        {data?.map((c) => (
          <li key={c._id} className="flex justify-between items-center px-3 py-2">
            <span>{c.name}</span>
            <button
              onClick={() => del.mutate(c._id)}
              className="text-red-600 text-sm underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}