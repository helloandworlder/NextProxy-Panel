import { Card, Spin, Descriptions, Tag } from 'antd';
import dayjs from 'dayjs';
import { useTenant } from '../hooks/useSettings';
import { useAuthStore } from '@/features/auth/store/authStore';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const currentTenant = useAuthStore((s) => s.currentTenant);
  const { data: tenant, isLoading } = useTenant();

  if (isLoading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unlimited';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Tenant Information">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tenant Name">{tenant?.name}</Descriptions.Item>
            <Descriptions.Item label="Slug">{tenant?.slug}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={tenant?.status === 'active' ? 'green' : 'red'}>{tenant?.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Created">{tenant?.createdAt ? dayjs(tenant.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
            <Descriptions.Item label="Expires">{tenant?.expiresAt ? dayjs(tenant.expiresAt).format('YYYY-MM-DD') : 'Never'}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="Current User">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Username">{user?.username}</Descriptions.Item>
            <Descriptions.Item label="Email">{user?.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Role"><Tag color="blue">{currentTenant?.role}</Tag></Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title="Quota Limits" className="lg:col-span-2">
          <Descriptions column={3} bordered size="small">
            <Descriptions.Item label="Max Nodes">{tenant?.maxNodes || 'Unlimited'}</Descriptions.Item>
            <Descriptions.Item label="Max Clients">{tenant?.maxClients || 'Unlimited'}</Descriptions.Item>
            <Descriptions.Item label="Max Traffic">{formatBytes(tenant?.maxTrafficBytes || 0)}</Descriptions.Item>
          </Descriptions>
          <p className="text-gray-500 text-sm mt-4">Contact system administrator to modify quota limits.</p>
        </Card>
      </div>
    </div>
  );
}
