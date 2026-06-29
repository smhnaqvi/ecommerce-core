"use client";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useIsServer } from "@/lib/useIsServer";

import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const isServer = useIsServer();
  const badge = isServer ? 0 : count; // 0 on the server so markup matches

  
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="rounded border px-3 py-1 text-sm" />
        </form>
        <Link href="/" className="text-xl font-bold">Buraq</Link>
        <div className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          <Link href="/cart" className="relative">
            Cart
            {badge > 0 && (
              <span className="absolute -right-3 -top-2 rounded-full bg-black px-1.5 text-xs text-white">
                {badge}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link href="/orders">Orders</Link>
              <span>Hi, {user.name}</span>
              <button onClick={logout} className="underline">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}