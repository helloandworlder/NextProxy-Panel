import apiClient from '@/shared/api/apiClient';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  maxNodes: number;
  maxClients: number;
  maxTrafficBytes: string;
  settings: Record<string, any>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStats {
  nodeCount: number;
  clientCount: number;
  onlineNodes: number;
  totalTrafficBytes: string;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  maxNodes?: number;
  maxClients?: number;
  maxTrafficBytes?: string;
  settings?: Record<string, any>;
  expiresAt?: string;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {
  status?: string;
}

export const tenantsApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<{ data: Tenant[]; total: number; page: number; limit: number }>('/tenants', { params: { page, limit } }),

  get: (id: string) => apiClient.get<Tenant>(`/tenants/${id}`),

  getCurrent: () => apiClient.get<Tenant>('/tenants/current'),

  getStats: (id: string) => apiClient.get<TenantStats>(`/tenants/${id}/stats`),

  create: (data: CreateTenantRequest) => apiClient.post<Tenant>('/tenants', data),

  update: (id: string, data: UpdateTenantRequest) => apiClient.put<Tenant>(`/tenants/${id}`, data),

  delete: (id: string) => apiClient.delete(`/tenants/${id}`),
};
