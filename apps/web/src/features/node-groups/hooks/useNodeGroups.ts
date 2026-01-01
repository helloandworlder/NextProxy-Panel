import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { nodeGroupsApi, CreateNodeGroupRequest, UpdateNodeGroupRequest } from '../api/nodeGroupsApi';

export function useNodeGroups() {
  return useQuery({
    queryKey: ['node-groups'],
    queryFn: () => nodeGroupsApi.getAll(),
  });
}

export function useCreateNodeGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: CreateNodeGroupRequest) => nodeGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-groups'] });
      message.success('Node group created successfully');
    },
    onError: () => message.error('Failed to create node group'),
  });
}

export function useUpdateNodeGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNodeGroupRequest }) => nodeGroupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-groups'] });
      message.success('Node group updated successfully');
    },
    onError: () => message.error('Failed to update node group'),
  });
}

export function useDeleteNodeGroup() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => nodeGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-groups'] });
      message.success('Node group deleted successfully');
    },
    onError: () => message.error('Failed to delete node group'),
  });
}
