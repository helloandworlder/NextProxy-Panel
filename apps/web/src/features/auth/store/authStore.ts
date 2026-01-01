import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TenantInfo } from '@/shared/types';

interface AuthState {
  token: string | null;
  user: User | null;
  currentTenant: TenantInfo | null;
  tenants: TenantInfo[];
  setAuth: (token: string, user: User, currentTenant: TenantInfo, tenants: TenantInfo[]) => void;
  switchTenant: (token: string, tenant: TenantInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentTenant: null,
      tenants: [],
      setAuth: (token, user, currentTenant, tenants) => 
        set({ token, user, currentTenant, tenants }),
      switchTenant: (token, tenant) => 
        set({ token, currentTenant: tenant }),
      logout: () => 
        set({ token: null, user: null, currentTenant: null, tenants: [] }),
    }),
    {
      name: 'panel-auth',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user, 
        currentTenant: state.currentTenant,
        tenants: state.tenants,
      }),
    }
  )
);
