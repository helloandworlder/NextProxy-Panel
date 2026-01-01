import { useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useDnsConfigs, useDeleteDnsConfig } from '../hooks/useDnsConfig';
import { DnsConfigFormModal } from './DnsConfigFormModal';
import type { DnsConfig } from '../api/dnsConfigApi';

export function DnsConfigPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DnsConfig | null>(null);

  const { data: nodes = [] } = useNodes();
  const { data: configs = [], isLoading } = useDnsConfigs(selectedNodeId);
  const { mutate: deleteConfig } = useDeleteDnsConfig();

  const handleEdit = (config: DnsConfig) => {
    setEditingConfig(config);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setModalOpen(true);
  };

  const columns: ColumnsType<DnsConfig> = [
    {
      title: 'Node',
      dataIndex: ['node', 'name'],
      key: 'node',
      render: (_, r) => r.node?.name || r.nodeId,
    },
    {
      title: 'Servers',
      key: 'servers',
      render: (_, r) => {
        const servers = (r.dnsConfig as { servers?: string[] })?.servers || [];
        return servers.slice(0, 2).join(', ') + (servers.length > 2 ? '...' : '');
      },
    },
    {
      title: 'Status',
      dataIndex: 'enable',
      key: 'enable',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Enabled' : 'Disabled'}</Tag>,
    },
    { title: 'Remark', dataIndex: 'remark', key: 'remark' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this DNS config?" onConfirm={() => deleteConfig(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">DNS Config</h1>
        <Space>
          <Select
            allowClear
            placeholder="Filter by node"
            style={{ width: 200 }}
            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
            onChange={setSelectedNodeId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add DNS Config
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={configs} rowKey="id" loading={isLoading} />
      <DnsConfigFormModal open={modalOpen} onClose={() => setModalOpen(false)} dnsConfig={editingConfig} />
    </div>
  );
}
