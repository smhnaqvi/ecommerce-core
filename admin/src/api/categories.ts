import { api } from "./client";

const list = () => api.get("/categories").then(r => r.data);
const create = (data: { name: string }) => api.post("/categories", data).then(r => r.data);
const remove = (id: string) => api.delete(`/categories/${id}`).then(r => r.data);

export default {
    list, create, remove
}