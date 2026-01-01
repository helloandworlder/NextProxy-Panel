import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { usePool, useAddToPool, useDeleteFromPool, useInventory } from '../hooks/useGosea';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { BatchGenerateModal } from './BatchGenerateModal';
import type { Socks5Proxy, AddProxyRequest } from '../api/goseaApi';

export function PoolTab() {
  const [statusFilter, setStatusFilter] = useState<string>();
  const [countryFilter, setCountryFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  const { data, isLoading, refetch } = usePool(statusFilter, countryFilter);
  const { data: inventory } = useInventory();
  const { data: nodes } = useNodes();
  const addMutation = useAddToPool();
  const deleteMutation = useDeleteFromPool();

  // 从库存动态获取国家列表（用于筛选）
  const countryOptions = inventory 
    ? [...new Set(inventory.map(i => i.countryCode))].map(c => ({ value: c, label: c }))
    : [];

  const handleAdd = async () => {
    const values = await form.validateFields();
    await addMutation.mutateAsync({ proxies: [values as AddProxyRequest] });
    setModalOpen(false);
    form.resetFields();
  };

  const handleBulkAdd = async () => {
    const { proxiesText, countryCode } = await bulkForm.validateFields();
    const lines = proxiesText.split('\n').filter((l: string) => l.trim());
    const proxies: AddProxyRequest[] = lines.map((line: string) => {
      const [ip, port, username, password] = line.split(':');
      return { ip, port: parseInt(port), username, password, countryCode };
    });
    await addMutation.mutateAsync({ proxies });
    setBulkModalOpen(false);
    bulkForm.resetFields();
  };

  const columns = [
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    { title: 'Country', dataIndex: 'countryCode', key: 'countryCode' },
    { title: 'City', dataIndex: 'cityCode', key: 'cityCode', render: (v: string) => v || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'available' ? 'green' : s === 'allocated' ? 'blue' : 'red'}>{s}</Tag> },
    { title: 'Allocations', key: 'alloc', render: (_: unknown, r: Socks5Proxy) => `${r.currentAllocations}/${r.maxAllocations}` },
    { title: 'Expires', dataIndex: 'expiresAt', key: 'expiresAt', render: (v: string) => v ? new Date(v).toLocaleDateString() : 'Never' },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Socks5Proxy) => (
        <Popconfirm title="Delete this proxy?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Select placeholder="Status" allowClear style={{ width: 120 }} onChange={setStatusFilter}
            options={[{ value: 'available' }, { value: 'allocated' }, { value: 'expired' }]} />
          <Select placeholder="Country" allowClear style={{ width: 150 }} onChange={setCountryFilter} options={countryOptions} />
        </Space>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={() => setBatchModalOpen(true)}>Batch Generate</Button>
          <Button icon={<UploadOutlined />} onClick={() => setBulkModalOpen(true)}>Bulk Import</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Proxy</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small" />

      <Modal title="Add Proxy" open={modalOpen} onOk={handleAdd} onCancel={() => setModalOpen(false)} confirmLoading={addMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="ip" label="IP" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="port" label="Port" rules={[{ required: true }]}><InputNumber min={1} max={65535} className="w-full" /></Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="countryCode" label="Country Code" rules={[{ required: true }]}><Input placeholder="e.g., US, JP, HK" /></Form.Item>
          <Form.Item name="cityCode" label="City"><Input /></Form.Item>
          <Form.Item name="maxAllocations" label="Max Allocations" initialValue={1}><InputNumber min={1} className="w-full" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Bulk Import" open={bulkModalOpen} onOk={handleBulkAdd} onCancel={() => setBulkModalOpen(false)} confirmLoading={addMutation.isPending}>
        <Form form={bulkForm} layout="vertical">
          <Form.Item name="countryCode" label="Country Code" rules={[{ required: true }]}><Input placeholder="e.g., US, JP, HK" /></Form.Item>
          <Form.Item name="proxiesText" label="Proxies (ip:port:user:pass per line)" rules={[{ required: true }]}>
            <Input.TextArea rows={10} placeholder="192.168.1.1:1080:user1:pass1&#10;192.168.1.2:1080:user2:pass2" />
          </Form.Item>
        </Form>
      </Modal>

      <BatchGenerateModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        nodes={nodes || []}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
