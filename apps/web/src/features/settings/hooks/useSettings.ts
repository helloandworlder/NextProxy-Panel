import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { settingsApi, UpdateTenantRequest } from '../api/settingsApi';

export function useTenant() {
  return useQuery({
    queryKey: ['tenant'],
    queryFn: () => settingsApi.getTenant(),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (data: UpdateTenantRequest) => settingsApi.updateTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      message.success('Settings updated successfully');
    },
    onError: () => message.error('Failed to update settings'),
  });
}
