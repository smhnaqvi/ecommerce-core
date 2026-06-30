import { Routes, Route } from "react-router-dom";
import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./components/AdminLayout";
import ProductForm from "./pages/ProductForm";
import Login from "./pages/Login";
import Categories from "./pages/Categories";
import Orders from "./pages/Orders";
// import RequireAdmin from "@/components/RequireAdmin";
// import AdminLayout from "@/components/AdminLayout";
// import Login from "@/pages/Login";
// import Products from "@/pages/Products";
// import ProductForm from "@/pages/ProductForm";
// import Categories from "@/pages/Categories";
// import Orders from "@/pages/Orders";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          {/* <Route path="/" element={<Products />} /> */}
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
      </Route>
    </Routes>
  );
}