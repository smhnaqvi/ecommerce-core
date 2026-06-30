import { create } from "zustand";
import api from "../api";
import type { User } from "../types/user.type";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    try { set({ user: await api.auth.getMe() }); }
    catch { set({ user: null }); }
    finally { set({ loading: false }); }
  },
  login: async (email, password) => {
    const user = await api.auth.login(email, password);
    if (!user.isAdmin) throw new Error("Admin access only");
    set({ user });
  },
  logout: async () => { await api.auth.logout(); set({ user: null }); },
}));