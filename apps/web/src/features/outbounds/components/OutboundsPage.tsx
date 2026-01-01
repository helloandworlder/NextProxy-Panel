import { useState } from 'react';
import { Table, Button, Tag, Space, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useOutbounds, useDeleteOutbound } from '../hooks/useOutbounds';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { OutboundFormModal } from './OutboundFormModal';
import type { Outbound } from '../api/outboundsApi';

export function OutboundsPage() {
  const [nodeId, setNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOutbound, setEditingOutbound] = useState<Outbound | null>(null);

  const { data: nodes } = useNodes();
  const { data: outbounds, isLoading } = useOutbounds(nodeId);
  const { mutate: deleteOutbound } = useDeleteOutbound();

  const columns = [
    { title: 'Tag', dataIndex: 'tag', key: 'tag' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag color="purple">{p}</Tag> },
    { title: 'Send Through', dataIndex: 'sendThrough', key: 'sendThrough', render: (v: string) => v || '-' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority' },
    { title: 'Node', key: 'node', render: (_: unknown, r: Outbound) => r.node?.name || '-' },
    { title: 'Status', dataIndex: 'enable', key: 'enable', render: (e: boolean) => <Tag color={e ? 'green' : 'red'}>{e ? 'Enabled' : 'Disabled'}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Outbound) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingOutbound(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this outbound?" onConfirm={() => deleteOutbound(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Outbounds</h1>
        <Space>
          <Select placeholder="Filter by node" allowClear style={{ width: 200 }} onChange={setNodeId} value={nodeId}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingOutbound(null); setModalOpen(true); }}>Add Outbound</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={outbounds} rowKey="id" loading={isLoading} />
      <OutboundFormModal open={modalOpen} outbound={editingOutbound} onClose={() => { setModalOpen(false); setEditingOutbound(null); }} />
    </div>
  );
}
