import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { apiKeysApi, CreateApiKeyRequest } from '../api/apiKeysApi';

export function useApiKeys(tenantId: string) {
  return useQuery({
    queryKey: ['api-keys', tenantId],
    queryFn: () => apiKeysApi.list(tenantId).then((res) => res.data),
    enabled: !!tenantId,
  });
}

export function useCreateApiKey(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApiKeyRequest) => apiKeysApi.create(tenantId, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] });
    },
    onError: () => message.error('Failed to create API key'),
  });
}

export function useDeleteApiKey(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiKeysApi.delete(tenantId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] });
      message.success('API key deleted successfully');
    },
    onError: () => message.error('Failed to delete API key'),
  });
}
