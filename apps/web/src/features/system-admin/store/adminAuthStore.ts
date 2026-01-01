import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: 'system_admin';
  isSystemAdmin: true;
}

interface AdminAuthState {
  token: string | null;
  user: AdminUser | null;
  setAuth: (token: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'panel-admin-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
