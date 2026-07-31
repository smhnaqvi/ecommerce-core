import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

interface SliderItem {
  _id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  order: number;
  isActive: boolean;
}

type ApiError = { response?: { data?: { message?: string } } };

export default function Sliders() {
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery<SliderItem[]>({
    queryKey: ["sliders"],
    queryFn: api.sliders.list,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sliders"] });

  const create = useMutation({
    mutationFn: (form: FormData) => api.sliders.create(form),
    onSuccess: invalidate,
    onError: (err: ApiError) =>
      setError(err?.response?.data?.message ?? "Failed to create slide"),
  });

  const update = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormData }) =>
      api.sliders.update(id, form),
    onSuccess: invalidate,
    onError: (err: ApiError) =>
      setError(err?.response?.data?.message ?? "Failed to update slide"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.sliders.remove(id),
    onSuccess: invalidate,
  });

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Slider</h1>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <NewSlideForm
        onSubmit={(form) => {
          setError("");
          create.mutate(form);
        }}
        pending={create.isPending}
      />

      <div className="space-y-4 mt-8">
        {data?.map((slide) => (
          <SlideRow
            key={slide._id}
            slide={slide}
            onSave={(form) => {
              setError("");
              update.mutate({ id: slide._id, form });
            }}
            onDelete={() => remove.mutate(slide._id)}
            pending={update.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function NewSlideForm({
  onSubmit,
  pending,
}: {
  onSubmit: (form: FormData) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState("0");
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("title", title);
    form.append("subtitle", subtitle);
    form.append("link", link);
    form.append("order", order);
    form.append("image", file);
    onSubmit(form);
    setTitle("");
    setSubtitle("");
    setLink("");
    setOrder("0");
    setFile(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 rounded p-4 space-y-2"
    >
      <h2 className="font-semibold text-sm mb-2">Add slide</h2>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        placeholder="Subtitle"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        placeholder="Link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        type="number"
        placeholder="Order"
        value={order}
        onChange={(e) => setOrder(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add slide"}
      </button>
    </form>
  );
}

function SlideRow({
  slide,
  onSave,
  onDelete,
  pending,
}: {
  slide: SliderItem;
  onSave: (form: FormData) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState(slide.title ?? "");
  const [subtitle, setSubtitle] = useState(slide.subtitle ?? "");
  const [link, setLink] = useState(slide.link ?? "");
  const [order, setOrder] = useState(String(slide.order));
  const [isActive, setIsActive] = useState(slide.isActive);
  const [file, setFile] = useState<File | null>(null);

  function handleSave() {
    const form = new FormData();
    form.append("title", title);
    form.append("subtitle", subtitle);
    form.append("link", link);
    form.append("order", order);
    form.append("isActive", String(isActive));
    if (file) form.append("image", file);
    onSave(form);
  }

  return (
    <div className="border border-gray-200 rounded p-4 flex gap-4">
      <img
        src={slide.imageUrl}
        className="w-32 h-20 object-cover rounded shrink-0"
      />
      <div className="flex-1 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            className="w-24 border border-gray-300 rounded px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-600 text-sm px-4 py-2 hover:bg-red-50 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
