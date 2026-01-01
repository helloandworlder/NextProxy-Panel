import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { clientsApi } from '../api/clientsApi';
import type { CreateClientRequest, UpdateClientRequest } from '@/shared/types';

export function useClients(filters?: { enable?: boolean; search?: string }) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientsApi.getAll(filters),
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clientsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateClientRequest) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client created successfully');
    },
    onError: () => message.error('Failed to create client'),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client updated successfully');
    },
    onError: () => message.error('Failed to update client'),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Client deleted successfully');
    },
    onError: () => message.error('Failed to delete client'),
  });
}

export function useResetTraffic() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => clientsApi.resetTraffic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success('Traffic reset successfully');
    },
    onError: () => message.error('Failed to reset traffic'),
  });
}

// ==================== Batch Operations ====================

export function useBatchEnable() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (ids: string[]) => clientsApi.batchEnable(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success(`${data.updated} clients enabled`);
    },
    onError: () => message.error('Failed to enable clients'),
  });
}

export function useBatchDisable() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (ids: string[]) => clientsApi.batchDisable(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success(`${data.updated} clients disabled`);
    },
    onError: () => message.error('Failed to disable clients'),
  });
}

export function useBatchDelete() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (ids: string[]) => clientsApi.batchDelete(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success(`${data.deleted} clients deleted`);
    },
    onError: () => message.error('Failed to delete clients'),
  });
}

export function useBatchResetTraffic() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (ids: string[]) => clientsApi.batchResetTraffic(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      message.success(`${data.reset} clients traffic reset`);
    },
    onError: () => message.error('Failed to reset traffic'),
  });
}
