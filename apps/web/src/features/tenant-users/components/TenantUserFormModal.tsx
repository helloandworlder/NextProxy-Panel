import { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch } from 'antd';
import { useCreateTenantUser, useUpdateTenantUser } from '../hooks/useTenantUsers';
import type { TenantUser, CreateTenantUserRequest } from '../api/tenantUsersApi';

interface Props {
  open: boolean;
  user: TenantUser | null;
  tenantId: string;
  onClose: () => void;
}

export function TenantUserFormModal({ open, user, tenantId, onClose }: Props) {
  const [form] = Form.useForm<CreateTenantUserRequest & { enable?: boolean }>();
  const { mutate: createUser, isPending: creating } = useCreateTenantUser(tenantId);
  const { mutate: updateUser, isPending: updating } = useUpdateTenantUser(tenantId);

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({ email: user.email || '', role: user.role, enable: user.enable });
      } else {
        form.resetFields();
        form.setFieldsValue({ role: 'operator', enable: true });
      }
    }
  }, [open, user, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (user) {
      updateUser({ userId: user.id, data: values }, { onSuccess: onClose });
    } else {
      createUser(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal title={user ? 'Edit User' : 'Add User'} open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={creating || updating}>
      <Form form={form} layout="vertical">
        {!user && (
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please input username' }]}>
            <Input placeholder="e.g., admin" />
          </Form.Item>
        )}
        <Form.Item name="password" label={user ? 'New Password (leave empty to keep)' : 'Password'} rules={user ? [] : [{ required: true, message: 'Please input password' }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="e.g., admin@example.com" />
        </Form.Item>
        <Form.Item name="role" label="Role">
          <Select>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="operator">Operator</Select.Option>
            <Select.Option value="readonly">Read Only</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="enable" label="Enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
