import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { policyConfigApi, CreatePolicyConfigRequest, UpdatePolicyConfigRequest } from '../api/policyConfigApi';

export function usePolicyConfigs(nodeId?: string) {
  return useQuery({
    queryKey: ['policy-configs', nodeId],
    queryFn: () => policyConfigApi.getAll(nodeId),
  });
}

export function usePolicyConfig(id: string) {
  return useQuery({
    queryKey: ['policy-config', id],
    queryFn: () => policyConfigApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreatePolicyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePolicyConfigRequest) => policyConfigApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-configs'] });
      message.success('Policy config created');
    },
    onError: () => message.error('Failed to create policy config'),
  });
}

export function useUpdatePolicyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePolicyConfigRequest }) =>
      policyConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-configs'] });
      message.success('Policy config updated');
    },
    onError: () => message.error('Failed to update policy config'),
  });
}

export function useDeletePolicyConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policyConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-configs'] });
      message.success('Policy config deleted');
    },
    onError: () => message.error('Failed to delete policy config'),
  });
}
