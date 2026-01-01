import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAdminTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from '../hooks/useAdminHooks';
import type { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../api/systemAdminApi';

export function AdminTenantsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useAdminTenants(page, 20);
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const deleteMutation = useDeleteTenant();

  const openCreate = () => { setEditingTenant(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (tenant: Tenant) => { setEditingTenant(tenant); form.setFieldsValue(tenant); setModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingTenant) {
      await updateMutation.mutateAsync({ id: editingTenant.id, data: values as UpdateTenantRequest });
    } else {
      await createMutation.mutateAsync(values as CreateTenantRequest);
    }
    setModalOpen(false);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Users', key: 'users', render: (_: unknown, r: Tenant) => r._count?.memberships || 0 },
    { title: 'Nodes', key: 'nodes', render: (_: unknown, r: Tenant) => r._count?.nodes || 0 },
    { title: 'Clients', key: 'clients', render: (_: unknown, r: Tenant) => r._count?.clients || 0 },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: Tenant) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this tenant?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Tenant</Button>
      </div>
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, pageSize: 20, onChange: setPage }}
      />
      <Modal title={editingTenant ? 'Edit Tenant' : 'Create Tenant'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          {!editingTenant && <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>}
          {editingTenant && <Form.Item name="status" label="Status"><Select options={[{ value: 'active' }, { value: 'suspended' }, { value: 'expired' }]} /></Form.Item>}
          <Form.Item name="maxNodes" label="Max Nodes"><Input type="number" /></Form.Item>
          <Form.Item name="maxClients" label="Max Clients"><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
