"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register)
    const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try { await register(name, email, password); router.push("/"); }
    catch { setError("Invalid email or password"); }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Register</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full rounded border px-3 py-2" type="name" placeholder="Name"
        value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="w-full rounded bg-black py-2 text-white">Register</button>
    </form>
  );
}