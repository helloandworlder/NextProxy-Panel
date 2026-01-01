import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { tenantsApi, CreateTenantRequest, UpdateTenantRequest } from '../api/tenantsApi';

export function useTenants(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['tenants', page, limit],
    queryFn: () => tenantsApi.list(page, limit).then((res) => res.data),
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCurrentTenant() {
  return useQuery({
    queryKey: ['tenant', 'current'],
    queryFn: () => tenantsApi.getCurrent().then((res) => res.data),
  });
}

export function useTenantStats(id: string) {
  return useQuery({
    queryKey: ['tenant', id, 'stats'],
    queryFn: () => tenantsApi.getStats(id).then((res) => res.data),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantRequest) => tenantsApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      message.success('Tenant created successfully');
    },
    onError: () => message.error('Failed to create tenant'),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantRequest }) =>
      tenantsApi.update(id, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      message.success('Tenant updated successfully');
    },
    onError: () => message.error('Failed to update tenant'),
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      message.success('Tenant deleted successfully');
    },
    onError: () => message.error('Failed to delete tenant'),
  });
}
