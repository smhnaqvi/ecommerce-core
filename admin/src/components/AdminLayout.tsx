import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";


const navItems = [
  { to: "/", label: "Products" },
  { to: "/categories", label: "Categories" },
  { to: "/orders", label: "Orders" },
];

export default function AdminLayout() {
  const { logout } = useAuthStore();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-6">Buraq Admin</h1>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="mt-4 px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}