import { useState } from 'react';
import { Table, Button, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNodeGroups, useDeleteNodeGroup } from '../hooks/useNodeGroups';
import { NodeGroupFormModal } from './NodeGroupFormModal';
import type { NodeGroup } from '../api/nodeGroupsApi';

const GROUP_TYPE_COLORS: Record<string, string> = {
  residential_socks5: 'green',
  relay: 'blue',
  custom: 'default',
};

const GROUP_TYPE_LABELS: Record<string, string> = {
  residential_socks5: 'Residential Socks5',
  relay: 'Relay',
  custom: 'Custom',
};

export function NodeGroupsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<NodeGroup | null>(null);

  const { data: groups, isLoading } = useNodeGroups();
  const { mutate: deleteGroup } = useDeleteNodeGroup();

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { 
      title: 'Type', 
      dataIndex: 'groupType', 
      key: 'groupType', 
      render: (t: string) => (
        <Tag color={GROUP_TYPE_COLORS[t] || 'default'}>
          {GROUP_TYPE_LABELS[t] || t}
        </Tag>
      ),
    },
    { 
      title: 'Tags', 
      dataIndex: 'requiredTags', 
      key: 'requiredTags', 
      render: (tags: string[]) => tags?.map((tag: string) => <Tag key={tag}>{tag}</Tag>) || '-',
    },
    { title: 'LB Strategy', dataIndex: 'lbStrategy', key: 'lbStrategy', render: (s: string) => <Tag color="purple">{s.replace('_', ' ')}</Tag> },
    { title: 'Nodes', key: 'nodes', render: (_: unknown, r: NodeGroup) => r._count?.nodes ?? 0 },
    { title: 'Remark', dataIndex: 'remark', key: 'remark', render: (v: string) => v || '-' },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: NodeGroup) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingGroup(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this group?" onConfirm={() => deleteGroup(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Node Groups</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGroup(null); setModalOpen(true); }}>Add Group</Button>
      </div>
      <Table columns={columns} dataSource={groups} rowKey="id" loading={isLoading} />
      <NodeGroupFormModal open={modalOpen} group={editingGroup} onClose={() => { setModalOpen(false); setEditingGroup(null); }} />
    </div>
  );
}
