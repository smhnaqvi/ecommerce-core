import { api } from "./client";

const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password }).then(r => r.data);
const getMe = () => api.get("/auth/me").then(r => r.data);
const logout = () => api.post("/auth/logout").then(() => { });

export default {
    login, getMe, logout
}