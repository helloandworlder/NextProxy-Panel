import apiClient from '@/shared/api/apiClient';
import type { StatsOverview, NodeStats } from '@/shared/types';

export const statsApi = {
  getOverview: async (): Promise<StatsOverview> => {
    const response = await apiClient.get<StatsOverview>('/stats/overview');
    return response.data;
  },

  getNodeStats: async (nodeId: string): Promise<NodeStats> => {
    const response = await apiClient.get<NodeStats>(`/stats/nodes/${nodeId}`);
    return response.data;
  },
};
