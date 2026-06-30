import { create } from "zustand";
import * as authApi from "@/lib/authApi";
import type { User } from "@/lib/authApi";

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    try { set({ user: await authApi.getMe() }); }
    catch { set({ user: null }); }
    finally { set({ loading: false }); }
  },
  login: async (email, password) => {
    const user = await authApi.login(email, password);
    if (!user.isAdmin) throw new Error("Admin access only");
    set({ user });
  },
  register: async (name, email, password) =>
    set({ user: await authApi.register(name, email, password) }),
  logout: async () => { await authApi.logout(); set({ user: null }); },
}));