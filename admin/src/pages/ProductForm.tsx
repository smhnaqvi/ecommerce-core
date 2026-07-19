import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

type ApiError = { response?: { data?: { message?: string } } };

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isListed, setIsListed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  const { data: categories } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  });

  const { data: existing } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.products.getById(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setPrice(String(existing.price));
      setStock(String(existing.countInStock));
      setCategoryId(existing.category?._id ?? existing.category ?? "");
      setDescription(existing.description ?? "");
      // Products created before these flags existed have them undefined,
      // which should read as "visible" and "for sale".
      setIsListed(existing.isListed !== false);
      setIsActive(existing.isActive !== false);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: (form: FormData) =>
      isEdit
        ? api.products.updateProduct(id as string, form)
        : api.products.createProduct(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      navigate("/");
    },
    onError: (err: ApiError) => {
      setError(err?.response?.data?.message ?? "Failed to save product");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const form = new FormData();
    form.append("name", name);
    form.append("price", price);
    form.append("countInStock", stock);
    form.append("category", categoryId);
    form.append("description", description);
    form.append("isListed", String(isListed));
    form.append("isActive", String(isActive));
    for (const file of files) form.append("images", file);

    save.mutate(form);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? "Edit product" : "New product"}
      </h1>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          >
            <option value="">Select a category</option>
            {categories?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(e.target.files ? [...e.target.files] : [])}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          {isEdit && existing?.images?.length > 0 && (
            <div className="flex gap-2 mt-2">
              {existing.images.map((img: string, i: number) => (
                <img key={i} src={img} className="w-16 h-16 object-cover rounded" />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <p className="text-sm font-medium">Visibility</p>

          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={isListed}
              onChange={(e) => setIsListed(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              Show on the storefront
              <span className="block text-gray-500">
                Uncheck for landing-page-only products. They stay hidden from
                browse and search, but can still be ordered from a landing page.
              </span>
            </span>
          </label>

          <label className="flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              Available for sale
              <span className="block text-gray-500">
                Uncheck to stop all new orders, including from landing pages.
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={save.isPending}
          className="bg-black text-white rounded px-6 py-2 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}