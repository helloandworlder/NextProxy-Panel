import apiClient from '@/shared/api/apiClient';
import type { Node, CreateNodeRequest, UpdateNodeRequest } from '@/shared/types';

export const nodesApi = {
  getAll: async (filters?: { status?: string; countryCode?: string; nodeGroupId?: string }): Promise<Node[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.countryCode) params.append('countryCode', filters.countryCode);
    if (filters?.nodeGroupId) params.append('nodeGroupId', filters.nodeGroupId);
    const response = await apiClient.get<Node[]>(`/nodes?${params.toString()}`);
    return response.data;
  },

  getOne: async (id: string): Promise<Node> => {
    const response = await apiClient.get<Node>(`/nodes/${id}`);
    return response.data;
  },

  create: async (data: CreateNodeRequest): Promise<Node> => {
    const response = await apiClient.post<Node>('/nodes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateNodeRequest): Promise<Node> => {
    const response = await apiClient.put<Node>(`/nodes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/nodes/${id}`);
  },

  regenerateToken: async (id: string): Promise<Node> => {
    const response = await apiClient.post<Node>(`/nodes/${id}/regenerate-token`);
    return response.data;
  },
};
