import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // send/receive the http-only auth cookie
});

export interface User { _id: string; name: string; email: string; isAdmin: boolean; }

export const login = (email: string, password: string) =>
  api.post<User>("/auth/login", { email, password }).then((r) => r.data);
export const register = (name: string, email: string, password: string) =>
  api.post<User>("/auth/register", { name, email, password }).then((r) => r.data);
export const logout = () => api.post("/auth/logout").then(() => {});
export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);