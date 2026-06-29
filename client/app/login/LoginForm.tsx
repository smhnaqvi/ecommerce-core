"use client";
import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push(redirect);
    } catch {
      setError("Invalid email or password");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="w-full rounded bg-black py-2 text-white">Login</button>
      <p className="text-sm text-gray-500">
        No account? <a href={`/register?redirect=${redirect}`} className="underline">Register</a>
      </p>
    </form>
  );
}