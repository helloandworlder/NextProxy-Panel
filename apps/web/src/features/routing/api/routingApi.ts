import apiClient from '@/shared/api/apiClient';

export interface RoutingRule {
  id: string;
  tenantId: string;
  nodeId: string;
  ruleTag: string;
  priority: number;
  ruleConfig: Record<string, unknown>;
  enable: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  node?: { id: string; name: string };
}

export interface CreateRoutingRuleRequest {
  nodeId: string;
  ruleTag: string;
  priority?: number;
  ruleConfig: Record<string, unknown>;
  enable?: boolean;
  remark?: string;
}

export type UpdateRoutingRuleRequest = Partial<CreateRoutingRuleRequest>;

export const routingApi = {
  getAll: async (nodeId?: string): Promise<RoutingRule[]> => {
    const params = nodeId ? `?nodeId=${nodeId}` : '';
    const response = await apiClient.get<RoutingRule[]>(`/routing-rules${params}`);
    return response.data;
  },

  getOne: async (id: string): Promise<RoutingRule> => {
    const response = await apiClient.get<RoutingRule>(`/routing-rules/${id}`);
    return response.data;
  },

  create: async (data: CreateRoutingRuleRequest): Promise<RoutingRule> => {
    const response = await apiClient.post<RoutingRule>('/routing-rules', data);
    return response.data;
  },

  update: async (id: string, data: UpdateRoutingRuleRequest): Promise<RoutingRule> => {
    const response = await apiClient.put<RoutingRule>(`/routing-rules/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/routing-rules/${id}`);
  },
};
