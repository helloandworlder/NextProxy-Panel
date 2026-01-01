import apiClient from '@/shared/api/apiClient';

export interface Inbound {
  id: string;
  tenantId: string;
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen: string;
  settings: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
  sniffing?: Record<string, unknown>;
  allocate?: Record<string, unknown>;
  enable: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreateInboundRequest {
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen?: string;
  settings?: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
  sniffing?: Record<string, unknown>;
  enable?: boolean;
  remark?: string;
}

export type UpdateInboundRequest = Partial<CreateInboundRequest>;

export const inboundsApi = {
  getAll: async (nodeId?: string): Promise<Inbound[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<Inbound[]>(`/inbounds${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<Inbound> => {
    const response = await apiClient.get<Inbound>(`/inbounds/${id}`);
    return response.data;
  },

  create: async (data: CreateInboundRequest): Promise<Inbound> => {
    const response = await apiClient.post<Inbound>('/inbounds', data);
    return response.data;
  },

  update: async (id: string, data: UpdateInboundRequest): Promise<Inbound> => {
    const response = await apiClient.put<Inbound>(`/inbounds/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inbounds/${id}`);
  },
};
