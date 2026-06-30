import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-gray-200 rounded p-6"
      >
        <h1 className="text-xl font-bold mb-6">Admin login</h1>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </p>
        )}

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          required
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-6"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}