import apiClient from '@/shared/api/apiClient';

export interface TenantUser {
  id: string;
  username: string;
  email: string | null;
  role: string;
  enable: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateTenantUserRequest {
  username: string;
  password: string;
  email?: string;
  role?: string;
  permissions?: string[];
  enable?: boolean;
}

export interface UpdateTenantUserRequest {
  email?: string;
  password?: string;
  role?: string;
  permissions?: string[];
  enable?: boolean;
}

export const tenantUsersApi = {
  list: (tenantId: string) => apiClient.get<TenantUser[]>(`/tenants/${tenantId}/users`),
  create: (tenantId: string, data: CreateTenantUserRequest) => apiClient.post<TenantUser>(`/tenants/${tenantId}/users`, data),
  update: (tenantId: string, userId: string, data: UpdateTenantUserRequest) => apiClient.put<TenantUser>(`/tenants/${tenantId}/users/${userId}`, data),
  delete: (tenantId: string, userId: string) => apiClient.delete(`/tenants/${tenantId}/users/${userId}`),
};
