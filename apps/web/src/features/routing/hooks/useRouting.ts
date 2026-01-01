import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { routingApi, CreateRoutingRuleRequest, UpdateRoutingRuleRequest } from '../api/routingApi';

export function useRoutingRules(nodeId?: string) {
  return useQuery({
    queryKey: ['routing-rules', nodeId],
    queryFn: () => routingApi.getAll(nodeId),
  });
}

export function useCreateRoutingRule() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateRoutingRuleRequest) => routingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      message.success('Routing rule created successfully');
    },
    onError: () => message.error('Failed to create routing rule'),
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutingRuleRequest }) => routingApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      message.success('Routing rule updated successfully');
    },
    onError: () => message.error('Failed to update routing rule'),
  });
}

export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => routingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      message.success('Routing rule deleted successfully');
    },
    onError: () => message.error('Failed to delete routing rule'),
  });
}
