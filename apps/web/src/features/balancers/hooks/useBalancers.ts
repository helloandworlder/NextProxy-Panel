import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { balancersApi, CreateBalancerRequest, UpdateBalancerRequest } from '../api/balancersApi';

export function useBalancers(nodeId?: string) {
  return useQuery({
    queryKey: ['balancers', nodeId],
    queryFn: () => balancersApi.getAll(nodeId),
  });
}

export function useBalancer(id: string) {
  return useQuery({
    queryKey: ['balancer', id],
    queryFn: () => balancersApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateBalancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBalancerRequest) => balancersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balancers'] });
      message.success('Balancer created');
    },
    onError: () => message.error('Failed to create balancer'),
  });
}

export function useUpdateBalancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBalancerRequest }) =>
      balancersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balancers'] });
      message.success('Balancer updated');
    },
    onError: () => message.error('Failed to update balancer'),
  });
}

export function useDeleteBalancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => balancersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balancers'] });
      message.success('Balancer deleted');
    },
    onError: () => message.error('Failed to delete balancer'),
  });
}
