import apiClient from '@/shared/api/apiClient';
import type { JsonObject } from '@/shared/types/json';

export interface PolicyConfig {
  id: string;
  tenantId: string;
  nodeId: string;
  policyConfig: JsonObject;
  enable: boolean;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreatePolicyConfigRequest {
  nodeId: string;
  policyConfig: JsonObject;
  enable?: boolean;
}

export type UpdatePolicyConfigRequest = Partial<CreatePolicyConfigRequest>;

export const policyConfigApi = {
  getAll: async (nodeId?: string): Promise<PolicyConfig[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<PolicyConfig[]>(`/policy-configs${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<PolicyConfig> => {
    const response = await apiClient.get<PolicyConfig>(`/policy-configs/${id}`);
    return response.data;
  },

  create: async (data: CreatePolicyConfigRequest): Promise<PolicyConfig> => {
    const response = await apiClient.post<PolicyConfig>('/policy-configs', data);
    return response.data;
  },

  update: async (id: string, data: UpdatePolicyConfigRequest): Promise<PolicyConfig> => {
    const response = await apiClient.put<PolicyConfig>(`/policy-configs/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/policy-configs/${id}`);
  },
};
