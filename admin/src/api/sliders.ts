import { api } from "./client";

const list = () => api.get("/sliders/admin").then(r => r.data);
const getById = (id: string) => api.get(`/sliders/${id}`).then(r => r.data);
const create = (form: FormData) => api.post("/sliders", form).then(r => r.data);
const update = (id: string, form: FormData) =>
  api.put(`/sliders/${id}`, form).then(r => r.data);
const remove = (id: string) => api.delete(`/sliders/${id}`).then(r => r.data);

export default {
    list,
    getById,
    create,
    update,
    remove
}
