import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { systemAdminApi, SystemAdmin, CreateSystemAdminRequest, UpdateSystemAdminRequest } from '../api/systemAdminApi';

export function AdminAdminsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SystemAdmin | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data, isLoading } = useQuery({ queryKey: ['admin', 'admins'], queryFn: () => systemAdminApi.getAdmins() });

  const createMutation = useMutation({
    mutationFn: (data: CreateSystemAdminRequest) => systemAdminApi.createAdmin(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] }); message.success('Admin created'); setModalOpen(false); },
    onError: () => { message.error('Failed to create admin'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSystemAdminRequest }) => systemAdminApi.updateAdmin(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] }); message.success('Admin updated'); setModalOpen(false); },
    onError: () => { message.error('Failed to update admin'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => systemAdminApi.deleteAdmin(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] }); message.success('Admin deleted'); },
    onError: () => { message.error('Failed to delete admin'); },
  });

  const openCreate = () => { setEditingAdmin(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (admin: SystemAdmin) => { setEditingAdmin(admin); form.setFieldsValue(admin); setModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingAdmin) {
      updateMutation.mutate({ id: editingAdmin.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'enable', key: 'enable', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Disabled'}</Tag> },
    { title: 'Last Login', dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: SystemAdmin) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this admin?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">System Admins</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create Admin</Button>
      </div>
      <Table columns={columns} dataSource={data || []} rowKey="id" loading={isLoading} />
      <Modal title={editingAdmin ? 'Edit Admin' : 'Create Admin'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: !editingAdmin, min: 3 }]}><Input disabled={!!editingAdmin} /></Form.Item>
          {!editingAdmin && <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>}
          {editingAdmin && <Form.Item name="password" label="New Password"><Input.Password placeholder="Leave empty to keep current" /></Form.Item>}
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
          {editingAdmin && <Form.Item name="enable" label="Active" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
}
