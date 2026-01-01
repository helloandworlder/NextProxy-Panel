import { useState } from 'react';
import { Table, Button, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTenantUsers, useDeleteTenantUser } from '../hooks/useTenantUsers';
import { TenantUserFormModal } from './TenantUserFormModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { TenantUser } from '../api/tenantUsersApi';

const roleColors: Record<string, string> = {
  admin: 'red',
  operator: 'blue',
  readonly: 'default',
};

export function TenantUsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const tenantId = useAuthStore((s) => s.currentTenant?.id) || '';

  const { data: users, isLoading } = useTenantUsers(tenantId);
  const { mutate: deleteUser } = useDeleteTenantUser(tenantId);

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v: string | null) => v || '-' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'enable',
      key: 'enable',
      render: (enable: boolean) => <Tag color={enable ? 'green' : 'red'}>{enable ? 'Enabled' : 'Disabled'}</Tag>,
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : 'Never'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: TenantUser) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this user?" onConfirm={() => deleteUser(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Tenant Users</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); setModalOpen(true); }}>
          Add User
        </Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" loading={isLoading} />
      <TenantUserFormModal open={modalOpen} user={editingUser} tenantId={tenantId} onClose={() => { setModalOpen(false); setEditingUser(null); }} />
    </div>
  );
}
