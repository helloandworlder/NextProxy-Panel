import { useState } from 'react';
import { Table, Button, Tag, Space, Popconfirm, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTenants, useDeleteTenant, useTenantStats } from '../hooks/useTenants';
import { TenantFormModal } from './TenantFormModal';
import type { Tenant } from '../api/tenantsApi';

function formatBytes(bytes: string | number): string {
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (num === 0) return 'Unlimited';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const statusColors: Record<string, string> = {
  active: 'green',
  suspended: 'orange',
  deleted: 'red',
};

export function TenantsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [statsId, setStatsId] = useState<string | null>(null);

  const { data, isLoading } = useTenants(page);
  const { mutate: deleteTenant } = useDeleteTenant();
  const { data: stats } = useTenantStats(statsId || '');

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Quota',
      key: 'quota',
      render: (_: unknown, r: Tenant) => (
        <span>
          {r.maxNodes} nodes / {r.maxClients} clients
        </span>
      ),
    },
    {
      title: 'Traffic Limit',
      dataIndex: 'maxTrafficBytes',
      key: 'maxTrafficBytes',
      render: (v: string) => formatBytes(v),
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : <Tag color="green">Never</Tag>),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Tenant) => (
        <Space>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => setStatsId(record.id)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingTenant(record); setModalOpen(true); }} />
          <Popconfirm title="Delete this tenant?" onConfirm={() => deleteTenant(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTenant(null); setModalOpen(true); }}>
          Add Tenant
        </Button>
      </div>

      {statsId && stats && (
        <Card className="mb-4" title="Tenant Statistics" extra={<Button size="small" onClick={() => setStatsId(null)}>Close</Button>}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="Nodes" value={stats.nodeCount} /></Col>
            <Col span={6}><Statistic title="Online Nodes" value={stats.onlineNodes} /></Col>
            <Col span={6}><Statistic title="Clients" value={stats.clientCount} /></Col>
            <Col span={6}><Statistic title="Total Traffic" value={formatBytes(stats.totalTrafficBytes)} /></Col>
          </Row>
        </Card>
      )}

      <Table
        columns={columns}
        dataSource={data?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total,
          pageSize: 20,
          onChange: setPage,
        }}
      />
      <TenantFormModal open={modalOpen} tenant={editingTenant} onClose={() => { setModalOpen(false); setEditingTenant(null); }} />
    </div>
  );
}
