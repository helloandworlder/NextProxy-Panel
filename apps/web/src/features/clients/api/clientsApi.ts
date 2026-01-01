import apiClient from '@/shared/api/apiClient';
import type { Client, CreateClientRequest, UpdateClientRequest, TrafficRecord } from '@/shared/types';

interface BatchResult {
  updated?: number;
  deleted?: number;
  reset?: number;
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}

export const clientsApi = {
  getAll: async (filters?: { enable?: boolean; search?: string }): Promise<Client[]> => {
    const params = new URLSearchParams();
    if (filters?.enable !== undefined) params.append('enable', String(filters.enable));
    if (filters?.search) params.append('search', filters.search);
    const response = await apiClient.get<ClientsResponse>(`/clients?${params.toString()}`);
    return response.data.clients;
  },

  getOne: async (id: string): Promise<Client> => {
    const response = await apiClient.get<Client>(`/clients/${id}`);
    return response.data;
  },

  create: async (data: CreateClientRequest): Promise<Client> => {
    const response = await apiClient.post<Client>('/clients', data);
    return response.data;
  },

  update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await apiClient.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  resetTraffic: async (id: string): Promise<Client> => {
    const response = await apiClient.post<Client>(`/clients/${id}/reset-traffic`);
    return response.data;
  },

  getTraffic: async (id: string, startTime?: number, endTime?: number): Promise<TrafficRecord[]> => {
    const params = new URLSearchParams();
    if (startTime) params.append('startTime', String(startTime));
    if (endTime) params.append('endTime', String(endTime));
    const response = await apiClient.get<TrafficRecord[]>(`/clients/${id}/traffic?${params.toString()}`);
    return response.data;
  },

  // Batch operations
  batchEnable: async (ids: string[]): Promise<BatchResult> => {
    const response = await apiClient.post<BatchResult>('/clients/batch/enable', { ids });
    return response.data;
  },

  batchDisable: async (ids: string[]): Promise<BatchResult> => {
    const response = await apiClient.post<BatchResult>('/clients/batch/disable', { ids });
    return response.data;
  },

  batchDelete: async (ids: string[]): Promise<BatchResult> => {
    const response = await apiClient.post<BatchResult>('/clients/batch/delete', { ids });
    return response.data;
  },

  batchResetTraffic: async (ids: string[]): Promise<BatchResult> => {
    const response = await apiClient.post<BatchResult>('/clients/batch/reset-traffic', { ids });
    return response.data;
  },
};
