import { useState } from 'react';
import { Table, Button, Tag, Space, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useInbounds, useDeleteInbound } from '../hooks/useInbounds';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { InboundFormModal } from './InboundFormModal';
import type { Inbound } from '../api/inboundsApi';

export function InboundsPage() {
  const [nodeId, setNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInbound, setEditingInbound] = useState<Inbound | null>(null);

  const { data: nodes } = useNodes();
  const { data: inbounds, isLoading } = useInbounds(nodeId);
  const { mutate: deleteInbound } = useDeleteInbound();

  const columns = [
    { title: 'Tag', dataIndex: 'tag', key: 'tag' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag color="blue">{p}</Tag> },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Listen', dataIndex: 'listen', key: 'listen' },
    { title: 'Node', key: 'node', render: (_: unknown, r: Inbound) => r.node?.name || '-' },
    { title: 'Status', dataIndex: 'enable', key: 'enable', render: (e: boolean) => <Tag color={e ? 'green' : 'red'}>{e ? 'Enabled' : 'Disabled'}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Inbound) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingInbound(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this inbound?" onConfirm={() => deleteInbound(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Inbounds</h1>
        <Space>
          <Select placeholder="Filter by node" allowClear style={{ width: 200 }} onChange={setNodeId} value={nodeId}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingInbound(null); setModalOpen(true); }}>Add Inbound</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={inbounds} rowKey="id" loading={isLoading} />
      <InboundFormModal open={modalOpen} inbound={editingInbound} onClose={() => { setModalOpen(false); setEditingInbound(null); }} />
    </div>
  );
}
