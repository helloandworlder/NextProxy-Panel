import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Switch, Tag, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { useAdminUsers, useAdminTenants, useCreateUser, useUpdateUser, useDeleteUser, useAssignUserToTenant, useRemoveUserFromTenant } from '../hooks/useAdminHooks';
import type { User, CreateUserRequest, UpdateUserRequest, AssignTenantRequest } from '../api/systemAdminApi';

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  const { data, isLoading } = useAdminUsers(page, 20);
  const { data: tenantsData } = useAdminTenants(1, 100);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const assignMutation = useAssignUserToTenant();
  const removeMutation = useRemoveUserFromTenant();

  const openCreate = () => { setEditingUser(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (user: User) => { setEditingUser(user); form.setFieldsValue(user); setModalOpen(true); };
  const openAssign = (user: User) => { setSelectedUser(user); assignForm.resetFields(); setAssignModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, data: values as UpdateUserRequest });
    } else {
      await createMutation.mutateAsync(values as CreateUserRequest);
    }
    setModalOpen(false);
  };

  const handleAssign = async () => {
    const values = await assignForm.validateFields();
    if (selectedUser) {
      await assignMutation.mutateAsync({ userId: selectedUser.id, data: values as AssignTenantRequest });
    }
    setAssignModalOpen(false);
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'enable', key: 'enable', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Disabled'}</Tag> },
    { title: 'Tenants', key: 'tenants', render: (_: unknown, r: User) => r.tenantMemberships?.map(m => (
      <Tag key={m.id} closable onClose={() => removeMutation.mutate({ userId: r.id, tenantId: m.tenant.id })}>{m.tenant.name} ({m.role})</Tag>
    )) },
    { title: 'Last Login', dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <Button icon={<UserAddOutlined />} size="small" onClick={() => openAssign(record)} title="Assign to Tenant" />
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <Popconfirm title="Delete this user?" onConfirm={() => deleteMutation.mutate(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create User</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} rowKey="id" loading={isLoading}
        pagination={{ current: page, total: data?.total || 0, pageSize: 20, onChange: setPage }} />
      
      <Modal title={editingUser ? 'Edit User' : 'Create User'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        confirmLoading={createMutation.isPending || updateMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: !editingUser }]}><Input disabled={!!editingUser} /></Form.Item>
          {!editingUser && <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>}
          {editingUser && <Form.Item name="password" label="New Password"><Input.Password placeholder="Leave empty to keep current" /></Form.Item>}
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
          <Form.Item name="enable" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Assign ${selectedUser?.username} to Tenant`} open={assignModalOpen} onOk={handleAssign} onCancel={() => setAssignModalOpen(false)}
        confirmLoading={assignMutation.isPending}>
        <Form form={assignForm} layout="vertical">
          <Form.Item name="tenantId" label="Tenant" rules={[{ required: true }]}>
            <Select options={tenantsData?.data?.map(t => ({ value: t.id, label: t.name })) || []} />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="operator">
            <Select options={[{ value: 'admin', label: 'Admin' }, { value: 'operator', label: 'Operator' }, { value: 'viewer', label: 'Viewer' }]} />
          </Form.Item>
          <Form.Item name="isDefault" label="Default Tenant" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
