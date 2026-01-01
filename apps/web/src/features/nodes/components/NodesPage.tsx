import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Input, Popconfirm, App, Segmented } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, ReloadOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useNodes, useDeleteNode, useRegenerateToken } from '../hooks/useNodes';
import { NodeFormModal } from './NodeFormModal';
import { NodeTopologyView } from './NodeTopologyView';
import type { Node } from '@/shared/types';

const { Search } = Input;
type ViewMode = 'table' | 'topology';

export function NodesPage() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { data: nodes, isLoading } = useNodes();
  const { mutate: deleteNode } = useDeleteNode();
  const { mutate: regenerateToken } = useRegenerateToken();
  const { message } = App.useApp();

  const filteredNodes = nodes?.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.countryName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyInstallCommand = (node: Node) => {
    const panelUrl = window.location.origin;
    const cmd = `curl -fsSL ${panelUrl}/install.sh | bash -s -- --token=${node.token} --panel=${panelUrl}`;
    navigator.clipboard.writeText(cmd);
    message.success('Install command copied to clipboard');
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setInstallModalOpen(true);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: Node, b: Node) => a.name.localeCompare(b.name) },
    { title: 'Location', key: 'location', render: (_: unknown, r: Node) => `${r.countryName || '-'} ${r.city || ''}`.trim() || '-' },
    { title: 'IP', dataIndex: 'publicIp', key: 'publicIp', render: (v: string) => v || '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'online' ? 'green' : status === 'maintenance' ? 'orange' : 'red'}>{status}</Tag>
      ),
    },
    { title: 'Online Users', key: 'users', render: (_: unknown, r: Node) => r.runtimeStats?.onlineUsers ?? 0 },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Node) => (
        <Space>
          <Button size="small" icon={<CopyOutlined />} onClick={() => { setSelectedNode(record); setInstallModalOpen(true); }}>Install</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingNode(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this node?" onConfirm={() => deleteNode(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Nodes</h1>
        <Space>
          <Segmented
            options={[
              { label: <><AppstoreOutlined /> Topology</>, value: 'topology' },
              { label: <><UnorderedListOutlined /> Table</>, value: 'table' },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
          <Search placeholder="Search nodes..." allowClear onSearch={setSearch} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingNode(null); setModalOpen(true); }}>Add Node</Button>
        </Space>
      </div>

      {viewMode === 'topology' ? (
        <NodeTopologyView nodes={filteredNodes || []} onNodeClick={handleNodeClick} />
      ) : (
        <Table columns={columns} dataSource={filteredNodes} rowKey="id" loading={isLoading} />
      )}

      <NodeFormModal open={modalOpen} node={editingNode} onClose={() => { setModalOpen(false); setEditingNode(null); }} />
      <Modal title="Install Command" open={installModalOpen} onCancel={() => setInstallModalOpen(false)} footer={null} width={700}>
        {selectedNode && (
          <div>
            <p className="mb-2">Run this command on your server to install the agent:</p>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              curl -fsSL {window.location.origin}/install.sh | bash -s -- --token={selectedNode.token} --panel={window.location.origin}
            </div>
            <div className="mt-4 flex gap-2">
              <Button icon={<CopyOutlined />} onClick={() => handleCopyInstallCommand(selectedNode)}>Copy Command</Button>
              <Popconfirm title="Regenerate token? Old token will be invalidated." onConfirm={() => regenerateToken(selectedNode.id)}>
                <Button icon={<ReloadOutlined />}>Regenerate Token</Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
