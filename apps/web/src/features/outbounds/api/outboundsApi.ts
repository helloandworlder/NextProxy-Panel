import apiClient from '@/shared/api/apiClient';

export interface Outbound {
  id: string;
  tenantId: string;
  nodeId: string;
  tag: string;
  protocol: string;
  sendThrough?: string;
  egressIpId?: string;
  settings: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
  proxySettings?: Record<string, unknown>;
  muxSettings?: Record<string, unknown>;
  priority: number;
  enable: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreateOutboundRequest {
  nodeId: string;
  tag: string;
  protocol: string;
  sendThrough?: string;
  egressIpId?: string;
  settings?: Record<string, unknown>;
  streamSettings?: Record<string, unknown>;
  proxySettings?: Record<string, unknown>;
  muxSettings?: Record<string, unknown>;
  priority?: number;
  enable?: boolean;
  remark?: string;
}

export type UpdateOutboundRequest = Partial<CreateOutboundRequest>;

export const outboundsApi = {
  getAll: async (nodeId?: string): Promise<Outbound[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<Outbound[]>(`/outbounds${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<Outbound> => {
    const response = await apiClient.get<Outbound>(`/outbounds/${id}`);
    return response.data;
  },

  create: async (data: CreateOutboundRequest): Promise<Outbound> => {
    const response = await apiClient.post<Outbound>('/outbounds', data);
    return response.data;
  },

  update: async (id: string, data: UpdateOutboundRequest): Promise<Outbound> => {
    const response = await apiClient.put<Outbound>(`/outbounds/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/outbounds/${id}`);
  },
};
