"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CategoryControls({
  slug,
  search,
  page,
  pages,
}: {
  slug: string;
  search: string;
  page: number;
  pages: number;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(search);

  function go(next: { search?: string; page?: number }) {
    const sp = new URLSearchParams();
    const s = next.search ?? term;
    const p = next.page ?? 1;
    if (s) sp.set("search", s);
    if (p > 1) sp.set("page", String(p));
    router.push(`/category/${slug}?${sp.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <form onSubmit={(e) => { e.preventDefault(); go({ search: term, page: 1 }); }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search…"
          className="rounded border px-3 py-1 text-sm"
        />
      </form>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => go({ page: page - 1 })}
            className="rounded border px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="text-sm">Page {page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => go({ page: page + 1 })}
            className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}