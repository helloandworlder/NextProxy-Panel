import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import type { LoginRequest, SwitchTenantRequest } from '@/shared/types';

export function useLogin() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user, data.currentTenant, data.tenants);
      message.success('Login successful');
      navigate('/dashboard');
    },
    onError: () => {
      message.error('Login failed. Please check your credentials.');
    },
  });
}

export function useSwitchTenant() {
  const { message } = App.useApp();
  const switchTenant = useAuthStore((s) => s.switchTenant);

  return useMutation({
    mutationFn: (data: SwitchTenantRequest) => authApi.switchTenant(data),
    onSuccess: (data) => {
      switchTenant(data.accessToken, data.currentTenant);
      message.success(`Switched to ${data.currentTenant.name}`);
      // Reload to refresh data for new tenant
      window.location.reload();
    },
    onError: () => {
      message.error('Failed to switch tenant');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return () => {
    logout();
    navigate('/login');
  };
}
