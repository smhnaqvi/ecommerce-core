import { api } from "./client";

const getById = (id: string) => api.get(`/products/${id}`).then(r => r.data);
const listProducts = () => api.get("/products", { params: { limit: 100 } }).then(r => r.data);
const deleteProduct = (id: string) => api.delete(`/products/${id}`).then(r => r.data);
const createProduct = (form: FormData) =>
  api.post("/products", form).then(r => r.data);     // multipart, browser sets the header
const updateProduct = (id: string, form: FormData) =>
    api.put(`/products/${id}`, form).then(r => r.data);

export default {
    getById,
    listProducts,
    deleteProduct,
    createProduct,
    updateProduct
}