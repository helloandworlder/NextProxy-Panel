import apiClient from '@/shared/api/apiClient';
import type { 
  LoginRequest, 
  LoginResponse, 
  SwitchTenantRequest, 
  SwitchTenantResponse,
  TenantInfo,
} from '@/shared/types';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  switchTenant: async (data: SwitchTenantRequest): Promise<SwitchTenantResponse> => {
    const response = await apiClient.post<SwitchTenantResponse>('/auth/switch-tenant', data);
    return response.data;
  },

  getTenants: async (): Promise<TenantInfo[]> => {
    const response = await apiClient.get<TenantInfo[]>('/auth/tenants');
    return response.data;
  },
};
