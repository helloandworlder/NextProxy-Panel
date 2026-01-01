import { useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSystemAdmins, useDeleteSystemAdmin } from '../hooks/useSystemAdmin';
import { SystemAdminFormModal } from './SystemAdminFormModal';
import { useI18n } from '@/hooks/useI18n';
import type { SystemAdmin } from '../api/systemAdminApi';

export function SystemAdminsPage() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdmin | null>(null);

  const { data: admins = [], isLoading } = useSystemAdmins();
  const { mutate: deleteAdmin } = useDeleteSystemAdmin();

  const handleEdit = (admin: SystemAdmin) => {
    setEditingAdmin(admin);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAdmin(null);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteAdmin(id, {
      onSuccess: () => message.success(t('common.deleteSuccess')),
      onError: (err: Error) => message.error(err.message),
    });
  };

  const columns: ColumnsType<SystemAdmin> = [
    { title: t('systemAdmin.username'), dataIndex: 'username', key: 'username' },
    { title: t('systemAdmin.email'), dataIndex: 'email', key: 'email' },
    {
      title: t('common.status'),
      dataIndex: 'enable',
      key: 'enable',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? t('common.enabled') : t('common.disabled')}</Tag>,
    },
    {
      title: t('systemAdmin.lastLogin'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (v) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => new Date(v).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('systemAdmin.title')}</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('systemAdmin.addAdmin')}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={admins}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />
      <SystemAdminFormModal
        open={modalOpen}
        admin={editingAdmin}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
