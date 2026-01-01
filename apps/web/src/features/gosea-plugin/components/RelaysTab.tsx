import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Descriptions, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, PauseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRelays, useCreateRelay, useUpdateRelay, useDeleteRelay } from '../hooks/useGosea';
import type { Relay } from '../api/goseaApi';

const { Text } = Typography;

export function RelaysTab() {
  const [statusFilter, setStatusFilter] = useState<string>();
  const [orderFilter, setOrderFilter] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Relay | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useRelays(statusFilter, orderFilter);
  const createMutation = useCreateRelay();
  const updateMutation = useUpdateRelay();
  const deleteMutation = useDeleteRelay();

  const handleCreate = async () => {
    const values = await form.validateFields();
    const payload: any = {
      externalOrderId: values.externalOrderId,
      externalUserId: values.externalUserId,
      protocol: values.protocol,
      preferredRegion: values.preferredRegion,
    };
    if (values.allocationId) {
      payload.allocationId = values.allocationId;
    } else if (values.targetIp) {
      payload.targetSocks5 = {
        ip: values.targetIp,
        port: values.targetPort,
        username: values.targetUsername,
        password: values.targetPassword,
      };
    }
    await createMutation.mutateAsync(payload);
    setModalOpen(false);
    form.resetFields();
  };

  const toggleStatus = (relay: Relay) => {
    const newStatus = relay.status === 'active' ? 'suspended' : 'active';
    updateMutation.mutate({ id: relay.id, data: { status: newStatus } });
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'externalOrderId', key: 'externalOrderId' },
    { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (p: string) => <Tag color={p === 'vless' ? 'blue' : 'purple'}>{p.toUpperCase()}</Tag> },
    { title: 'Listen Port', dataIndex: 'listenPort', key: 'listenPort' },
    { title: 'Target', key: 'target', render: (_: unknown, r: Relay) => `${r.targetIp}:${r.targetPort}` },
    { title: 'Node', key: 'node', render: (_: unknown, r: Relay) => r.node?.name || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'orange'}>{s}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Relay) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => setDetailModal(record)} />
          <Button icon={record.status === 'active' ? <PauseOutlined /> : <PlayCircleOutlined />} size="small" onClick={() => toggleStatus(record)} />
          <Popconfirm title="Delete this relay?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Select placeholder="Status" allowClear style={{ width: 120 }} onChange={setStatusFilter}
            options={[{ value: 'active' }, { value: 'suspended' }]} />
          <Input placeholder="Order ID" allowClear style={{ width: 150 }} onChange={(e) => setOrderFilter(e.target.value || undefined)} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Create Relay</Button>
      </div>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} size="small" />

      <Modal title="Create Relay" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)} confirmLoading={createMutation.isPending} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="externalOrderId" label="Order ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="externalUserId" label="User ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="protocol" label="Protocol" initialValue="vless">
            <Select options={[{ value: 'vless', label: 'VLESS' }, { value: 'shadowsocks', label: 'Shadowsocks' }]} />
          </Form.Item>
          <Form.Item name="preferredRegion" label="Preferred Region"><Input placeholder="e.g., US, JP" /></Form.Item>
          <Form.Item name="allocationId" label="Allocation ID (optional)"><Input placeholder="Use existing allocation" /></Form.Item>
          <div className="border-t pt-4 mt-4"><Text type="secondary">Or specify target Socks5 directly:</Text></div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="targetIp" label="Target IP"><Input /></Form.Item>
            <Form.Item name="targetPort" label="Target Port"><InputNumber min={1} max={65535} className="w-full" /></Form.Item>
            <Form.Item name="targetUsername" label="Username"><Input /></Form.Item>
            <Form.Item name="targetPassword" label="Password"><Input.Password /></Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal title="Relay Details" open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={600}>
        {detailModal && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Protocol">{detailModal.protocol.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="Host">{detailModal.connectionInfo?.host}</Descriptions.Item>
            <Descriptions.Item label="Port">{detailModal.connectionInfo?.port}</Descriptions.Item>
            {detailModal.connectionInfo?.uuid && <Descriptions.Item label="UUID"><Text copyable>{detailModal.connectionInfo.uuid}</Text></Descriptions.Item>}
            {detailModal.connectionInfo?.password && <Descriptions.Item label="Password"><Text copyable>{detailModal.connectionInfo.password}</Text></Descriptions.Item>}
            {detailModal.connectionInfo?.method && <Descriptions.Item label="Method">{detailModal.connectionInfo.method}</Descriptions.Item>}
            <Descriptions.Item label="Target">{detailModal.targetIp}:{detailModal.targetPort}</Descriptions.Item>
            <Descriptions.Item label="Target Auth">{detailModal.targetUsername}:***</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
