import apiClient from '@/shared/api/apiClient';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes?: string[];
  rateLimit?: number;
  allowedIps?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  key: string;
  prefix: string;
}

export const apiKeysApi = {
  list: (tenantId: string) => apiClient.get<ApiKey[]>(`/tenants/${tenantId}/api-keys`),
  create: (tenantId: string, data: CreateApiKeyRequest) => apiClient.post<CreateApiKeyResponse>(`/tenants/${tenantId}/api-keys`, data),
  delete: (tenantId: string, keyId: string) => apiClient.delete(`/tenants/${tenantId}/api-keys/${keyId}`),
};
