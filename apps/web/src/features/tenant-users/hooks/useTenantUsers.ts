import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { tenantUsersApi, CreateTenantUserRequest, UpdateTenantUserRequest } from '../api/tenantUsersApi';

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => tenantUsersApi.list(tenantId).then((res) => res.data),
    enabled: !!tenantId,
  });
}

export function useCreateTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantUserRequest) => tenantUsersApi.create(tenantId, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      message.success('User created successfully');
    },
    onError: () => message.error('Failed to create user'),
  });
}

export function useUpdateTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateTenantUserRequest }) =>
      tenantUsersApi.update(tenantId, userId, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      message.success('User updated successfully');
    },
    onError: () => message.error('Failed to update user'),
  });
}

export function useDeleteTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tenantUsersApi.delete(tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      message.success('User deleted successfully');
    },
    onError: () => message.error('Failed to delete user'),
  });
}
