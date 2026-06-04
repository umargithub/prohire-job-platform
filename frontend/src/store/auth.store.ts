"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/api';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: 'prohire-auth' },
  ),
);
