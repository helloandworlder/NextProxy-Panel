import apiClient from '@/shared/api/apiClient';
import type { JsonObject } from '@/shared/types/json';

export interface DnsConfig {
  id: string;
  tenantId: string;
  nodeId: string;
  dnsConfig: JsonObject;
  enable: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreateDnsConfigRequest {
  nodeId: string;
  dnsConfig: JsonObject;
  enable?: boolean;
  remark?: string;
}

export type UpdateDnsConfigRequest = Partial<CreateDnsConfigRequest>;

export const dnsConfigApi = {
  getAll: async (nodeId?: string): Promise<DnsConfig[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<DnsConfig[]>(`/dns-configs${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<DnsConfig> => {
    const response = await apiClient.get<DnsConfig>(`/dns-configs/${id}`);
    return response.data;
  },

  create: async (data: CreateDnsConfigRequest): Promise<DnsConfig> => {
    const response = await apiClient.post<DnsConfig>('/dns-configs', data);
    return response.data;
  },

  update: async (id: string, data: UpdateDnsConfigRequest): Promise<DnsConfig> => {
    const response = await apiClient.put<DnsConfig>(`/dns-configs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/dns-configs/${id}`);
  },
};
