import { useState } from 'react';
import { Table, Button, Tag, Space, Popconfirm, Modal, Input, message } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useApiKeys, useDeleteApiKey } from '../hooks/useApiKeys';
import { ApiKeyFormModal } from './ApiKeyFormModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { ApiKey } from '../api/apiKeysApi';

export function ApiKeysPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const tenantId = useAuthStore((s) => s.currentTenant?.id) || '';

  const { data: apiKeys, isLoading } = useApiKeys(tenantId);
  const { mutate: deleteKey } = useDeleteApiKey(tenantId);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Key Prefix', dataIndex: 'keyPrefix', key: 'keyPrefix', render: (v: string) => <code>{v}...</code> },
    {
      title: 'Scopes',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: string[]) => scopes.map((s) => <Tag key={s}>{s}</Tag>),
    },
    { title: 'Rate Limit', dataIndex: 'rateLimit', key: 'rateLimit', render: (v: number) => `${v}/min` },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : <Tag color="green">Never</Tag>),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : 'Never'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: ApiKey) => (
        <Popconfirm title="Delete this API key?" onConfirm={() => deleteKey(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Create API Key
        </Button>
      </div>
      <Table columns={columns} dataSource={apiKeys} rowKey="id" loading={isLoading} />
      <ApiKeyFormModal
        open={modalOpen}
        tenantId={tenantId}
        onClose={() => setModalOpen(false)}
        onCreated={(key) => { setNewKey(key); setModalOpen(false); }}
      />
      <Modal
        title="API Key Created"
        open={!!newKey}
        onOk={() => setNewKey(null)}
        onCancel={() => setNewKey(null)}
        footer={[<Button key="ok" type="primary" onClick={() => setNewKey(null)}>Done</Button>]}
      >
        <p className="mb-2">Your API key has been created. Copy it now - you won't be able to see it again!</p>
        <Space.Compact className="w-full">
          <Input value={newKey || ''} readOnly className="font-mono" />
          <Button icon={<CopyOutlined />} onClick={() => newKey && copyToClipboard(newKey)} />
        </Space.Compact>
      </Modal>
    </div>
  );
}
