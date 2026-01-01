import { useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useBalancers, useDeleteBalancer } from '../hooks/useBalancers';
import { BalancerFormModal } from './BalancerFormModal';
import type { Balancer } from '../api/balancersApi';
import type { JsonObject, JsonValue } from '@/shared/types/json';

// Helper to safely access nested JsonObject properties
function getJsonProp<T = JsonValue>(obj: JsonObject | undefined, key: string): T | undefined {
  return obj?.[key] as T | undefined;
}

export function BalancersPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBalancer, setEditingBalancer] = useState<Balancer | null>(null);

  const { data: nodes = [] } = useNodes();
  const { data: balancers = [], isLoading } = useBalancers(selectedNodeId);
  const { mutate: deleteBalancer } = useDeleteBalancer();

  const handleEdit = (balancer: Balancer) => {
    setEditingBalancer(balancer);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBalancer(null);
    setModalOpen(true);
  };

  const columns: ColumnsType<Balancer> = [
    { title: 'Tag', dataIndex: 'tag', key: 'tag' },
    {
      title: 'Node',
      dataIndex: ['node', 'name'],
      key: 'node',
      render: (_, r) => r.node?.name || r.nodeId,
    },
    {
      title: 'Strategy',
      key: 'strategy',
      render: (_, r) => {
        const strategy = getJsonProp<JsonObject>(r.balancerConfig, 'strategy');
        return getJsonProp<string>(strategy, 'type') || 'random';
      },
    },
    {
      title: 'Selectors',
      key: 'selectors',
      render: (_, r) => {
        const selector = getJsonProp<JsonValue[]>(r.balancerConfig, 'selector');
        return Array.isArray(selector) ? selector.length : 0;
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
          <Popconfirm title="Delete this balancer?" onConfirm={() => deleteBalancer(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Balancers</h1>
        <Space>
          <Select
            allowClear
            placeholder="Filter by node"
            style={{ width: 200 }}
            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
            onChange={setSelectedNodeId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Balancer
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={balancers} rowKey="id" loading={isLoading} />
      <BalancerFormModal open={modalOpen} onClose={() => setModalOpen(false)} balancer={editingBalancer} />
    </div>
  );
}
