import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { outboundsApi, CreateOutboundRequest, UpdateOutboundRequest } from '../api/outboundsApi';

export function useOutbounds(nodeId?: string) {
  return useQuery({
    queryKey: ['outbounds', nodeId],
    queryFn: () => outboundsApi.getAll(nodeId),
  });
}

export function useCreateOutbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateOutboundRequest) => outboundsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbounds'] });
      message.success('Outbound created successfully');
    },
    onError: () => message.error('Failed to create outbound'),
  });
}

export function useUpdateOutbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOutboundRequest }) => outboundsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbounds'] });
      message.success('Outbound updated successfully');
    },
    onError: () => message.error('Failed to update outbound'),
  });
}

export function useDeleteOutbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => outboundsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbounds'] });
      message.success('Outbound deleted successfully');
    },
    onError: () => message.error('Failed to delete outbound'),
  });
}
