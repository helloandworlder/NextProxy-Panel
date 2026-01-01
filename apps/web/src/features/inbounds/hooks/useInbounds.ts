import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { inboundsApi, CreateInboundRequest, UpdateInboundRequest } from '../api/inboundsApi';

export function useInbounds(nodeId?: string) {
  return useQuery({
    queryKey: ['inbounds', nodeId],
    queryFn: () => inboundsApi.getAll(nodeId),
  });
}

export function useCreateInbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateInboundRequest) => inboundsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] });
      message.success('Inbound created successfully');
    },
    onError: () => message.error('Failed to create inbound'),
  });
}

export function useUpdateInbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInboundRequest }) => inboundsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] });
      message.success('Inbound updated successfully');
    },
    onError: () => message.error('Failed to update inbound'),
  });
}

export function useDeleteInbound() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => inboundsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] });
      message.success('Inbound deleted successfully');
    },
    onError: () => message.error('Failed to delete inbound'),
  });
}
