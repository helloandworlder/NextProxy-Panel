import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useInventory } from '../hooks/useGosea';
import type { InventoryItem } from '../api/goseaApi';

export function InventoryTab() {
  const { data, isLoading } = useInventory();

  const totalAvailable = data?.reduce((sum, item) => sum + item.available, 0) || 0;
  const totalAllocated = data?.reduce((sum, item) => sum + item.allocated, 0) || 0;
  const totalProxies = data?.reduce((sum, item) => sum + item.total, 0) || 0;

  const columns = [
    { title: 'Country', dataIndex: 'countryCode', key: 'countryCode', render: (v: string) => <Tag icon={<GlobalOutlined />}>{v}</Tag> },
    { title: 'City', dataIndex: 'cityCode', key: 'cityCode', render: (v: string) => v || 'All' },
    { title: 'Total', dataIndex: 'total', key: 'total' },
    { title: 'Available', dataIndex: 'available', key: 'available', render: (v: number) => <span className="text-green-600 font-medium">{v}</span> },
    { title: 'Allocated', dataIndex: 'allocated', key: 'allocated', render: (v: number) => <span className="text-blue-600 font-medium">{v}</span> },
    { title: 'Usage', key: 'usage', render: (_: unknown, r: InventoryItem) => `${r.total > 0 ? ((r.allocated / r.total) * 100).toFixed(1) : 0}%` },
  ];

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}><Card><Statistic title="Total Proxies" value={totalProxies} loading={isLoading} /></Card></Col>
        <Col span={8}><Card><Statistic title="Available" value={totalAvailable} valueStyle={{ color: '#3f8600' }} loading={isLoading} /></Card></Col>
        <Col span={8}><Card><Statistic title="Allocated" value={totalAllocated} valueStyle={{ color: '#1890ff' }} loading={isLoading} /></Card></Col>
      </Row>
      <Table columns={columns} dataSource={data || []} rowKey={(r) => `${r.countryCode}-${r.cityCode || 'all'}`} loading={isLoading} size="small" />
    </div>
  );
}
