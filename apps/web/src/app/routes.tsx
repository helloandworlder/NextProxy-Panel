import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAdminAuthStore } from '@/features/system-admin/store/adminAuthStore';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { MainLayout } from '@/shared/components/MainLayout';
import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import { NodesPage } from '@/features/nodes/components/NodesPage';
import { ClientsPage } from '@/features/clients/components/ClientsPage';
import { InboundsPage } from '@/features/inbounds/components/InboundsPage';
import { OutboundsPage } from '@/features/outbounds/components/OutboundsPage';
import { RoutingPage } from '@/features/routing/components/RoutingPage';
import { NodeGroupsPage } from '@/features/node-groups/components/NodeGroupsPage';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { BalancersPage } from '@/features/balancers/components/BalancersPage';
import { DnsConfigPage } from '@/features/dns-config/components/DnsConfigPage';
import { PolicyConfigPage } from '@/features/policy-config/components/PolicyConfigPage';
import { AuditLogsPage } from '@/features/audit-logs/components/AuditLogsPage';
import { TenantUsersPage } from '@/features/tenant-users/components/TenantUsersPage';
import { ApiKeysPage } from '@/features/api-keys/components/ApiKeysPage';
import { GoSeaPluginPage } from '@/features/gosea-plugin/components/GoSeaPluginPage';
// Admin imports
import { AdminLayout } from '@/features/system-admin/components/AdminLayout';
import { AdminLoginPage } from '@/features/system-admin/components/AdminLoginPage';
import { AdminDashboardPage } from '@/features/system-admin/components/AdminDashboardPage';
import { AdminTenantsPage } from '@/features/system-admin/components/AdminTenantsPage';
import { AdminUsersPage } from '@/features/system-admin/components/AdminUsersPage';
import { AdminAdminsPage } from '@/features/system-admin/components/AdminAdminsPage';
import { AdminSettingsPage } from '@/features/system-admin/components/AdminSettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAdminAuthStore((s) => s.token);
  if (!token) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Tenant User Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="nodes" element={<NodesPage />} />
        <Route path="node-groups" element={<NodeGroupsPage />} />
        <Route path="inbounds" element={<InboundsPage />} />
        <Route path="outbounds" element={<OutboundsPage />} />
        <Route path="routing" element={<RoutingPage />} />
        <Route path="balancers" element={<BalancersPage />} />
        <Route path="dns-config" element={<DnsConfigPage />} />
        <Route path="policy-config" element={<PolicyConfigPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="tenant-users" element={<TenantUsersPage />} />
        <Route path="api-keys" element={<ApiKeysPage />} />
        <Route path="gosea-plugin" element={<GoSeaPluginPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* System Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="tenants" element={<AdminTenantsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}
