import { createElement, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import RequireAdmin from "./components/RequireAdmin";
import AdminLayout from "./components/AdminLayout";

const Login = lazy(() => import("./pages/Login"));
const Products = lazy(() => import("./pages/Products"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const Categories = lazy(() => import("./pages/Categories"));
const Orders = lazy(() => import("./pages/Orders"));

const e = createElement;

export const router = createBrowserRouter([
  {
    path: "/",
    element: e(App),
    children: [
      { path: "login", element: e(Login) },
      {
        element: e(RequireAdmin),
        children: [
          {
            element: e(AdminLayout),
            children: [
              { index: true, element: e(Products) },
              { path: "products/new", element: e(ProductForm) },
              { path: "products/:id/edit", element: e(ProductForm) },
              { path: "categories", element: e(Categories) },
              { path: "orders", element: e(Orders) },
            ],
          },
        ],
      },
    ],
  },
]);
