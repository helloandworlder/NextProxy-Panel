import apiClient from '@/shared/api/apiClient';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  apiKeyId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  changes?: { before?: unknown; after?: unknown };
  ip?: string;
  userAgent?: string;
  createdAt: string;
  user?: { id: string; username: string; email?: string };
}

export interface AuditLogQuery {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export const auditLogsApi = {
  getAll: async (query: AuditLogQuery = {}): Promise<AuditLogResponse> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, String(value));
    });
    const response = await apiClient.get<AuditLogResponse>(`/audit-logs?${params}`);
    return response.data;
  },

  getActions: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit-logs/actions');
    return response.data;
  },

  getResourceTypes: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit-logs/resource-types');
    return response.data;
  },
};
