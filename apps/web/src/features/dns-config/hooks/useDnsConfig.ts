import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { dnsConfigApi, CreateDnsConfigRequest, UpdateDnsConfigRequest } from '../api/dnsConfigApi';

export function useDnsConfigs(nodeId?: string) {
  return useQuery({
    queryKey: ['dns-configs', nodeId],
    queryFn: () => dnsConfigApi.getAll(nodeId),
  });
}

export function useDnsConfig(id: string) {
  return useQuery({
    queryKey: ['dns-config', id],
    queryFn: () => dnsConfigApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateDnsConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDnsConfigRequest) => dnsConfigApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dns-configs'] });
      message.success('DNS config created');
    },
    onError: () => message.error('Failed to create DNS config'),
  });
}

export function useUpdateDnsConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDnsConfigRequest }) =>
      dnsConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dns-configs'] });
      message.success('DNS config updated');
    },
    onError: () => message.error('Failed to update DNS config'),
  });
}

export function useDeleteDnsConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dnsConfigApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dns-configs'] });
      message.success('DNS config deleted');
    },
    onError: () => message.error('Failed to delete DNS config'),
  });
}
