import { apiClient } from '@/shared/api/apiClient';

// ==================== Types ====================

export interface SystemAdmin {
  id: string;
  username: string;
  email?: string;
  enable: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SystemAdminLoginRequest {
  username: string;
  password: string;
}

export interface SystemAdminLoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email?: string;
    role: 'system_admin';
    isSystemAdmin: true;
  };
}

export interface CreateSystemAdminRequest {
  username: string;
  password: string;
  email?: string;
}

export interface UpdateSystemAdminRequest {
  email?: string;
  password?: string;
  enable?: boolean;
}

// Tenant Types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  maxNodes: number;
  maxClients: number;
  maxTrafficBytes: string;
  settings: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { memberships: number; nodes: number; clients: number };
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  maxNodes?: number;
  maxClients?: number;
  settings?: Record<string, unknown>;
  expiresAt?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: string;
  maxNodes?: number;
  maxClients?: number;
  settings?: Record<string, unknown>;
  expiresAt?: string;
}

// User Types
export interface TenantMembership {
  id: string;
  role: string;
  isDefault: boolean;
  tenant: { id: string; name: string; slug: string };
}

export interface User {
  id: string;
  username: string;
  email?: string;
  enable: boolean;
  lastLoginAt?: string;
  createdAt: string;
  tenantMemberships: TenantMembership[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  enable?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  enable?: boolean;
}

export interface AssignTenantRequest {
  tenantId: string;
  role?: string;
  permissions?: string[];
  isDefault?: boolean;
}

// Dashboard Types
export interface DashboardStats {
  tenantCount: number;
  userCount: number;
  nodeCount: number;
  clientCount: number;
  onlineNodes: number;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ==================== API ====================

export const systemAdminApi = {
  // Auth
  login: (data: SystemAdminLoginRequest) =>
    apiClient.post<SystemAdminLoginResponse>('/system-admin/login', data).then(res => res.data),

  // Dashboard
  getDashboard: () =>
    apiClient.get<DashboardStats>('/system-admin/dashboard').then(res => res.data),

  // System Admins
  getAdmins: () =>
    apiClient.get<SystemAdmin[]>('/system-admin/admins').then(res => res.data),

  getAdmin: (id: string) =>
    apiClient.get<SystemAdmin>(`/system-admin/admins/${id}`).then(res => res.data),

  createAdmin: (data: CreateSystemAdminRequest) =>
    apiClient.post<SystemAdmin>('/system-admin/admins', data).then(res => res.data),

  updateAdmin: (id: string, data: UpdateSystemAdminRequest) =>
    apiClient.put<SystemAdmin>(`/system-admin/admins/${id}`, data).then(res => res.data),

  deleteAdmin: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/system-admin/admins/${id}`).then(res => res.data),

  // Tenants
  getTenants: (page = 1, limit = 20, status?: string) =>
    apiClient.get<PaginatedResponse<Tenant>>('/system-admin/tenants', { params: { page, limit, status } }).then(res => res.data),

  getTenant: (id: string) =>
    apiClient.get<Tenant>(`/system-admin/tenants/${id}`).then(res => res.data),

  createTenant: (data: CreateTenantRequest) =>
    apiClient.post<Tenant>('/system-admin/tenants', data).then(res => res.data),

  updateTenant: (id: string, data: UpdateTenantRequest) =>
    apiClient.put<Tenant>(`/system-admin/tenants/${id}`, data).then(res => res.data),

  deleteTenant: (id: string) =>
    apiClient.delete(`/system-admin/tenants/${id}`).then(res => res.data),

  // Users
  getUsers: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<User>>('/system-admin/users', { params: { page, limit } }).then(res => res.data),

  getUser: (id: string) =>
    apiClient.get<User>(`/system-admin/users/${id}`).then(res => res.data),

  createUser: (data: CreateUserRequest) =>
    apiClient.post<User>('/system-admin/users', data).then(res => res.data),

  updateUser: (id: string, data: UpdateUserRequest) =>
    apiClient.put<User>(`/system-admin/users/${id}`, data).then(res => res.data),

  deleteUser: (id: string) =>
    apiClient.delete(`/system-admin/users/${id}`).then(res => res.data),

  assignUserToTenant: (userId: string, data: AssignTenantRequest) =>
    apiClient.post(`/system-admin/users/${userId}/assign-tenant`, data).then(res => res.data),

  removeUserFromTenant: (userId: string, tenantId: string) =>
    apiClient.delete(`/system-admin/users/${userId}/tenants/${tenantId}`).then(res => res.data),

  // Legacy (backward compatibility)
  getAll: () =>
    apiClient.get<SystemAdmin[]>('/system-admin').then(res => res.data),

  getOne: (id: string) =>
    apiClient.get<SystemAdmin>(`/system-admin/${id}`).then(res => res.data),

  create: (data: CreateSystemAdminRequest) =>
    apiClient.post<SystemAdmin>('/system-admin', data).then(res => res.data),

  update: (id: string, data: UpdateSystemAdminRequest) =>
    apiClient.put<SystemAdmin>(`/system-admin/${id}`, data).then(res => res.data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/system-admin/${id}`).then(res => res.data),

  // System Settings
  getSettings: () =>
    apiClient.get<Record<string, unknown>>('/system-admin/settings').then(res => res.data),

  getSetting: (key: string) =>
    apiClient.get<{ key: string; value: unknown }>(`/system-admin/settings/${key}`).then(res => res.data),

  updateSetting: (key: string, value: unknown) =>
    apiClient.put(`/system-admin/settings/${key}`, { value }).then(res => res.data),

  validateRelease: (repo: string, release?: string) =>
    apiClient.post<{ valid: boolean; error?: string; release?: { tag: string; name: string; assets: Array<{ name: string; url: string }> } }>(
      '/system-admin/settings/validate-release',
      { repo, release }
    ).then(res => res.data),
};
