import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAllocations, useAllocate, useRelease } from '../hooks/useGosea';
import type { Allocation } from '../api/goseaApi';

export function AllocationsTab() {
  const [statusFilter, setStatusFilter] = useState<string>();
  const [orderFilter, setOrderFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [form] = Form.useForm();

  const { data, isLoading } = useAllocations(statusFilter, orderFilter);
  const allocateMutation = useAllocate();
  const releaseMutation = useRelease();

  const handleAllocate = async () => {
    const values = await form.validateFields();
    await allocateMutation.mutateAsync(values);
    setModalOpen(false);
    form.resetFields();
  };

  const handleBulkRelease = () => {
    if (selectedRows.length > 0) {
      releaseMutation.mutate({ allocationIds: selectedRows });
      setSelectedRows([]);
    }
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'externalOrderId', key: 'externalOrderId' },
    { title: 'User ID', dataIndex: 'externalUserId', key: 'externalUserId' },
    { title: 'Proxy', key: 'proxy', render: (_: unknown, r: Allocation) => r.poolEntry ? `${r.poolEntry.ip}:${r.poolEntry.port}` : '-' },
    { title: 'Country', key: 'country', render: (_: unknown, r: Allocation) => r.poolEntry?.countryCode || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag> },
    { title: 'Allocated', dataIndex: 'allocatedAt', key: 'allocatedAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Expires', dataIndex: 'expiresAt', key: 'expiresAt', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Allocation) => record.status === 'active' && (
        <Popconfirm title="Release this allocation?" onConfirm={() => releaseMutation.mutate({ allocationIds: [record.id] })}>
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
            options={[{ value: 'active' }, { value: 'released' }, { value: 'expired' }]} />
          <Input placeholder="Order ID" allowClear style={{ width: 150 }} onChange={(e) => setOrderFilter(e.target.value || undefined)} />
        </Space>
        <Space>
          {selectedRows.length > 0 && <Button danger onClick={handleBulkRelease}>Release Selected ({selectedRows.length})</Button>}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Allocate</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small"
        rowSelection={{ selectedRowKeys: selectedRows, onChange: (keys) => setSelectedRows(keys as string[]) }} />

      <Modal title="Allocate Proxies" open={modalOpen} onOk={handleAllocate} onCancel={() => setModalOpen(false)} confirmLoading={allocateMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="externalOrderId" label="Order ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="externalUserId" label="User ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="countryCode" label="Country Code" rules={[{ required: true }]}><Input placeholder="e.g., US, JP, HK" /></Form.Item>
          <Form.Item name="cityCode" label="City (optional)"><Input /></Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]} initialValue={1}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="days" label="Days" rules={[{ required: true }]} initialValue={30}><InputNumber min={1} className="w-full" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
