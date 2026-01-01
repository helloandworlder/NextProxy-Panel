import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Popconfirm, Progress, Dropdown, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, ReloadOutlined, DownOutlined, DownloadOutlined, BarChartOutlined, QrcodeOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useClients, useDeleteClient, useResetTraffic, useBatchEnable, useBatchDisable, useBatchDelete, useBatchResetTraffic } from '../hooks/useClients';
import { ClientFormModal } from './ClientFormModal';
import { BulkCreateClientsModal } from './BulkCreateClientsModal';
import { SubscriptionModal } from './SubscriptionModal';
import { TrafficHistoryModal } from './TrafficHistoryModal';
import { QRCodeModal } from './QRCodeModal';
import type { Client } from '@/shared/types';

const { Search } = Input;

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [trafficModalOpen, setTrafficModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const { data: clients, isLoading } = useClients({ search: search || undefined });
  const { mutate: deleteClient } = useDeleteClient();
  const { mutate: resetTraffic } = useResetTraffic();
  const { mutate: batchEnable } = useBatchEnable();
  const { mutate: batchDisable } = useBatchDisable();
  const { mutate: batchDelete } = useBatchDelete();
  const { mutate: batchResetTraffic } = useBatchResetTraffic();

  const handleExport = () => {
    if (!clients?.length) return message.warning('No clients to export');
    const exportData = clients.map(({ email, uuid, totalBytes, expiryTime, enable, remark }) => ({
      email, uuid, totalBytes: String(totalBytes), expiryTime, enable, remark,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${dayjs().format('YYYY-MM-DD')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Clients exported');
  };

  const batchMenuItems = [
    { key: 'enable', label: 'Enable Selected', onClick: () => selectedRowKeys.length && batchEnable(selectedRowKeys, { onSuccess: () => setSelectedRowKeys([]) }) },
    { key: 'disable', label: 'Disable Selected', onClick: () => selectedRowKeys.length && batchDisable(selectedRowKeys, { onSuccess: () => setSelectedRowKeys([]) }) },
    { key: 'reset', label: 'Reset Traffic', onClick: () => selectedRowKeys.length && batchResetTraffic(selectedRowKeys, { onSuccess: () => setSelectedRowKeys([]) }) },
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete Selected', danger: true, onClick: () => selectedRowKeys.length && batchDelete(selectedRowKeys, { onSuccess: () => setSelectedRowKeys([]) }) },
  ];

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a: Client, b: Client) => a.email.localeCompare(b.email) },
    {
      title: 'Traffic',
      key: 'traffic',
      render: (_: unknown, r: Client) => {
        if (r.totalBytes === 0) return <span>{formatBytes(Number(r.usedBytes))} / Unlimited</span>;
        const percent = Math.min(100, (Number(r.usedBytes) / Number(r.totalBytes)) * 100);
        return (
          <div className="w-32">
            <Progress percent={percent} size="small" format={() => `${formatBytes(Number(r.usedBytes))} / ${formatBytes(Number(r.totalBytes))}`} />
          </div>
        );
      },
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_: unknown, r: Client) => {
        if (r.expiryTime === 0) return <Tag color="green">Never</Tag>;
        const expiry = dayjs(r.expiryTime * 1000);
        const isExpired = expiry.isBefore(dayjs());
        return <Tag color={isExpired ? 'red' : 'blue'}>{expiry.format('YYYY-MM-DD')}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'enable',
      key: 'enable',
      render: (enable: boolean) => <Tag color={enable ? 'green' : 'red'}>{enable ? 'Enabled' : 'Disabled'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Client) => (
        <Space>
          <Button size="small" icon={<QrcodeOutlined />} onClick={() => { setSelectedClient(record); setQrModalOpen(true); }}>QR</Button>
          <Button size="small" icon={<LinkOutlined />} onClick={() => { setSelectedClient(record); setSubModalOpen(true); }} disabled={!record.subId}>Sub</Button>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => { setSelectedClient(record); setTrafficModalOpen(true); }}>Traffic</Button>
          <Popconfirm title="Reset traffic?" onConfirm={() => resetTraffic(record.id)}>
            <Button size="small" icon={<ReloadOutlined />} />
          </Popconfirm>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingClient(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this client?" onConfirm={() => deleteClient(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Space>
          <Search placeholder="Search clients..." allowClear onSearch={setSearch} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          {selectedRowKeys.length > 0 && (
            <Dropdown menu={{ items: batchMenuItems }}>
              <Button>Batch ({selectedRowKeys.length}) <DownOutlined /></Button>
            </Dropdown>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
          <Button icon={<UsergroupAddOutlined />} onClick={() => setBulkModalOpen(true)}>Bulk Create</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingClient(null); setModalOpen(true); }}>Add Client</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={clients} rowKey="id" loading={isLoading} rowSelection={rowSelection} />
      <ClientFormModal open={modalOpen} client={editingClient} onClose={() => { setModalOpen(false); setEditingClient(null); }} />
      <BulkCreateClientsModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} />
      <SubscriptionModal open={subModalOpen} client={selectedClient} onClose={() => setSubModalOpen(false)} />
      <TrafficHistoryModal open={trafficModalOpen} client={selectedClient} onClose={() => setTrafficModalOpen(false)} />
      <QRCodeModal open={qrModalOpen} client={selectedClient} onClose={() => setQrModalOpen(false)} />
    </div>
  );
}
