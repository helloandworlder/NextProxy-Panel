import { useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { usePolicyConfigs, useDeletePolicyConfig } from '../hooks/usePolicyConfig';
import { PolicyConfigFormModal } from './PolicyConfigFormModal';
import type { PolicyConfig } from '../api/policyConfigApi';

export function PolicyConfigPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PolicyConfig | null>(null);

  const { data: nodes = [] } = useNodes();
  const { data: configs = [], isLoading } = usePolicyConfigs(selectedNodeId);
  const { mutate: deleteConfig } = useDeletePolicyConfig();

  const handleEdit = (config: PolicyConfig) => {
    setEditingConfig(config);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setModalOpen(true);
  };

  const columns: ColumnsType<PolicyConfig> = [
    {
      title: 'Node',
      dataIndex: ['node', 'name'],
      key: 'node',
      render: (_, r) => r.node?.name || r.nodeId,
    },
    {
      title: 'Levels',
      key: 'levels',
      render: (_, r) => {
        const levels = (r.policyConfig as { levels?: Record<string, unknown> })?.levels || {};
        return Object.keys(levels).length;
      },
    },
    {
      title: 'Status',
      dataIndex: 'enable',
      key: 'enable',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Enabled' : 'Disabled'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this policy config?" onConfirm={() => deleteConfig(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Policy Config</h1>
        <Space>
          <Select
            allowClear
            placeholder="Filter by node"
            style={{ width: 200 }}
            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
            onChange={setSelectedNodeId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Policy Config
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={configs} rowKey="id" loading={isLoading} />
      <PolicyConfigFormModal open={modalOpen} onClose={() => setModalOpen(false)} policyConfig={editingConfig} />
    </div>
  );
}
