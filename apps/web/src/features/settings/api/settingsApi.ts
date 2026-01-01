import apiClient from '@/shared/api/apiClient';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  maxNodes: number;
  maxClients: number;
  maxTrafficBytes: number;
  settings: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantRequest {
  name?: string;
  maxNodes?: number;
  maxClients?: number;
  maxTrafficBytes?: number;
  settings?: Record<string, unknown>;
}

export const settingsApi = {
  getTenant: async (): Promise<Tenant> => {
    const response = await apiClient.get<Tenant>('/tenants/current');
    return response.data;
  },

  updateTenant: async (data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.put<Tenant>('/tenants/current', data);
    return response.data;
  },
};
