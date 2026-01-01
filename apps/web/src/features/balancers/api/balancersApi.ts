import apiClient from '@/shared/api/apiClient';
import type { JsonObject } from '@/shared/types/json';

export interface Balancer {
  id: string;
  tenantId: string;
  nodeId: string;
  tag: string;
  balancerConfig: JsonObject;
  enable: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreateBalancerRequest {
  nodeId: string;
  tag: string;
  balancerConfig: JsonObject;
  enable?: boolean;
  remark?: string;
}

export type UpdateBalancerRequest = Partial<CreateBalancerRequest>;

export const balancersApi = {
  getAll: async (nodeId?: string): Promise<Balancer[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<Balancer[]>(`/balancers${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<Balancer> => {
    const response = await apiClient.get<Balancer>(`/balancers/${id}`);
    return response.data;
  },

  create: async (data: CreateBalancerRequest): Promise<Balancer> => {
    const response = await apiClient.post<Balancer>('/balancers', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBalancerRequest): Promise<Balancer> => {
    const response = await apiClient.put<Balancer>(`/balancers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/balancers/${id}`);
  },
};
