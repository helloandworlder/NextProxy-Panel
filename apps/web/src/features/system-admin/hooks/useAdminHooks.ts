import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { systemAdminApi, SystemAdminLoginRequest, CreateTenantRequest, UpdateTenantRequest, CreateUserRequest, UpdateUserRequest, AssignTenantRequest } from '../api/systemAdminApi';
import { useAdminAuthStore } from '../store/adminAuthStore';

// ==================== Auth ====================

export function useAdminLogin() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const setAuth = useAdminAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: SystemAdminLoginRequest) => systemAdminApi.login(data),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      message.success('Login successful');
      navigate('/admin/dashboard');
    },
    onError: () => {
      message.error('Login failed. Please check your credentials.');
    },
  });
}

export function useAdminLogout() {
  const navigate = useNavigate();
  const logout = useAdminAuthStore((s) => s.logout);
  return () => { logout(); navigate('/admin/login'); };
}

// ==================== Dashboard ====================

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => systemAdminApi.getDashboard(),
  });
}

// ==================== Tenants ====================

export function useAdminTenants(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', page, limit, status],
    queryFn: () => systemAdminApi.getTenants(page, limit, status),
  });
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: ['admin', 'tenant', id],
    queryFn: () => systemAdminApi.getTenant(id),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: CreateTenantRequest) => systemAdminApi.createTenant(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] }); message.success('Tenant created'); },
    onError: () => { message.error('Failed to create tenant'); },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }) => systemAdminApi.updateTenant(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] }); message.success('Tenant updated'); },
    onError: () => { message.error('Failed to update tenant'); },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => systemAdminApi.deleteTenant(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] }); message.success('Tenant deleted'); },
    onError: () => { message.error('Failed to delete tenant'); },
  });
}

// ==================== Users ====================

export function useAdminUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'users', page, limit],
    queryFn: () => systemAdminApi.getUsers(page, limit),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => systemAdminApi.getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => systemAdminApi.createUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); message.success('User created'); },
    onError: () => { message.error('Failed to create user'); },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => systemAdminApi.updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); message.success('User updated'); },
    onError: () => { message.error('Failed to update user'); },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => systemAdminApi.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); message.success('User deleted'); },
    onError: () => { message.error('Failed to delete user'); },
  });
}

export function useAssignUserToTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AssignTenantRequest }) => systemAdminApi.assignUserToTenant(userId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); message.success('User assigned to tenant'); },
    onError: () => { message.error('Failed to assign user'); },
  });
}

export function useRemoveUserFromTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ userId, tenantId }: { userId: string; tenantId: string }) => systemAdminApi.removeUserFromTenant(userId, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); message.success('User removed from tenant'); },
    onError: () => { message.error('Failed to remove user'); },
  });
}
