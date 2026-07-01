import { create } from "zustand";
import type { UserRole } from "@/types/api";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  initialized: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitialized: () => set({ initialized: true }),
}));

export function useAuthInitialized(): boolean {
  return useAuthStore((s) => s.initialized);
}
