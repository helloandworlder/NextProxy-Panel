import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { nodesApi } from '../api/nodesApi';
import type { CreateNodeRequest, UpdateNodeRequest } from '@/shared/types';

export function useNodes(filters?: { status?: string; countryCode?: string; nodeGroupId?: string }) {
  return useQuery({
    queryKey: ['nodes', filters],
    queryFn: () => nodesApi.getAll(filters),
  });
}

export function useNode(id: string) {
  return useQuery({
    queryKey: ['nodes', id],
    queryFn: () => nodesApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateNode() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateNodeRequest) => nodesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      message.success('Node created successfully');
    },
    onError: () => message.error('Failed to create node'),
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNodeRequest }) => nodesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      message.success('Node updated successfully');
    },
    onError: () => message.error('Failed to update node'),
  });
}

export function useDeleteNode() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => nodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      message.success('Node deleted successfully');
    },
    onError: () => message.error('Failed to delete node'),
  });
}

export function useRegenerateToken() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => nodesApi.regenerateToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      message.success('Token regenerated successfully');
    },
    onError: () => message.error('Failed to regenerate token'),
  });
}
