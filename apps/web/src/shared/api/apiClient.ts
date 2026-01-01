import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT token (supports both user and admin tokens)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if this is an admin API call
    const isAdminApi = config.url?.startsWith('/system-admin');
    
    let token: string | null = null;
    if (isAdminApi) {
      // Use admin token from localStorage
      const adminAuth = localStorage.getItem('panel-admin-auth');
      if (adminAuth) {
        try { token = JSON.parse(adminAuth)?.state?.token; } catch { /* ignore parse errors */ }
      }
    } else {
      token = useAuthStore.getState().token;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isAdminApi = error.config?.url?.startsWith('/system-admin');
      if (isAdminApi) {
        localStorage.removeItem('panel-admin-auth');
        window.location.href = '/admin/login';
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
