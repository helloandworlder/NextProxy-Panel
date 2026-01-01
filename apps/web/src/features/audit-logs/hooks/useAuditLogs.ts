import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, AuditLogQuery } from '../api/auditLogsApi';

export function useAuditLogs(query: AuditLogQuery = {}) {
  return useQuery({
    queryKey: ['audit-logs', query],
    queryFn: () => auditLogsApi.getAll(query),
  });
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: ['audit-log-actions'],
    queryFn: () => auditLogsApi.getActions(),
  });
}

export function useAuditLogResourceTypes() {
  return useQuery({
    queryKey: ['audit-log-resource-types'],
    queryFn: () => auditLogsApi.getResourceTypes(),
  });
}
