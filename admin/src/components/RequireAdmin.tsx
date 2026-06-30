import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function RequireAdmin() {
  const { user, loading } = useAuthStore();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user?.isAdmin) return <Navigate to="/login" replace />;
  return <Outlet />;
}