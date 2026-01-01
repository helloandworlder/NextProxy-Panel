import { useState } from 'react';
import { Table, Button, Tag, Space, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRoutingRules, useDeleteRoutingRule } from '../hooks/useRouting';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { RoutingFormModal } from './RoutingFormModal';
import type { RoutingRule } from '../api/routingApi';

export function RoutingPage() {
  const [nodeId, setNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);

  const { data: nodes } = useNodes();
  const { data: rules, isLoading } = useRoutingRules(nodeId);
  const { mutate: deleteRule } = useDeleteRoutingRule();

  const columns = [
    { title: 'Tag', dataIndex: 'ruleTag', key: 'ruleTag' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', sorter: (a: RoutingRule, b: RoutingRule) => a.priority - b.priority },
    { title: 'Outbound', key: 'outbound', render: (_: unknown, r: RoutingRule) => (r.ruleConfig as { outboundTag?: string })?.outboundTag || '-' },
    { title: 'Node', key: 'node', render: (_: unknown, r: RoutingRule) => r.node?.name || '-' },
    { title: 'Status', dataIndex: 'enable', key: 'enable', render: (e: boolean) => <Tag color={e ? 'green' : 'red'}>{e ? 'Enabled' : 'Disabled'}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: RoutingRule) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingRule(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this rule?" onConfirm={() => deleteRule(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Routing Rules</h1>
        <Space>
          <Select placeholder="Filter by node" allowClear style={{ width: 200 }} onChange={setNodeId} value={nodeId}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRule(null); setModalOpen(true); }}>Add Rule</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={rules} rowKey="id" loading={isLoading} />
      <RoutingFormModal open={modalOpen} rule={editingRule} onClose={() => { setModalOpen(false); setEditingRule(null); }} />
    </div>
  );
}
