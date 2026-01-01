import apiClient from '@/shared/api/apiClient';

export interface SchemaField {
  name: string;
  type: 'string' | 'select' | 'number';
  required: boolean;
  options?: string[];
}

export interface NodeGroup {
  id: string;
  tenantId: string;
  name: string;
  groupType: string;
  schemaFields: SchemaField[];
  requiredTags: string[];
  lbStrategy: string;
  lbSettings: Record<string, unknown>;
  healthCheck: Record<string, unknown>;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { nodes: number };
}

export interface CreateNodeGroupRequest {
  name: string;
  groupType?: string;
  schemaFields?: SchemaField[];
  requiredTags?: string[];
  lbStrategy?: string;
  lbSettings?: Record<string, unknown>;
  healthCheck?: Record<string, unknown>;
  remark?: string;
}

export type UpdateNodeGroupRequest = Partial<CreateNodeGroupRequest>;

export const nodeGroupsApi = {
  getAll: async (): Promise<NodeGroup[]> => {
    const response = await apiClient.get<NodeGroup[]>('/node-groups');
    return response.data;
  },

  getOne: async (id: string): Promise<NodeGroup> => {
    const response = await apiClient.get<NodeGroup>(`/node-groups/${id}`);
    return response.data;
  },

  create: async (data: CreateNodeGroupRequest): Promise<NodeGroup> => {
    const response = await apiClient.post<NodeGroup>('/node-groups', data);
    return response.data;
  },

  update: async (id: string, data: UpdateNodeGroupRequest): Promise<NodeGroup> => {
    const response = await apiClient.put<NodeGroup>(`/node-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/node-groups/${id}`);
  },
};
