import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/statsApi';

export function useStatsOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: statsApi.getOverview,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useNodeStats(nodeId: string) {
  return useQuery({
    queryKey: ['stats', 'node', nodeId],
    queryFn: () => statsApi.getNodeStats(nodeId),
    enabled: !!nodeId,
  });
}
