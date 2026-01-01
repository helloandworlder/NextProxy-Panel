import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { useCreateTenant, useUpdateTenant } from '../hooks/useTenants';
import type { Tenant, CreateTenantRequest } from '../api/tenantsApi';

interface Props {
  open: boolean;
  tenant: Tenant | null;
  onClose: () => void;
}

export function TenantFormModal({ open, tenant, onClose }: Props) {
  const [form] = Form.useForm<CreateTenantRequest & { status?: string }>();
  const { mutate: createTenant, isPending: creating } = useCreateTenant();
  const { mutate: updateTenant, isPending: updating } = useUpdateTenant();

  useEffect(() => {
    if (open) {
      if (tenant) {
        form.setFieldsValue({
          name: tenant.name,
          slug: tenant.slug,
          maxNodes: tenant.maxNodes,
          maxClients: tenant.maxClients,
          maxTrafficBytes: tenant.maxTrafficBytes,
          status: tenant.status,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ maxNodes: 10, maxClients: 1000, maxTrafficBytes: '0' });
      }
    }
  }, [open, tenant, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (tenant) {
      updateTenant({ id: tenant.id, data: values }, { onSuccess: onClose });
    } else {
      createTenant(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      title={tenant ? 'Edit Tenant' : 'Add Tenant'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={creating || updating}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input tenant name' }]}>
          <Input placeholder="e.g., My Company" />
        </Form.Item>
        <Form.Item
          name="slug"
          label="Slug"
          rules={[
            { required: true, message: 'Please input tenant slug' },
            { pattern: /^[a-z0-9-]+$/, message: 'Slug must be lowercase letters, numbers, and hyphens only' },
          ]}
        >
          <Input placeholder="e.g., my-company" disabled={!!tenant} />
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="maxNodes" label="Max Nodes">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="maxClients" label="Max Clients">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
        </div>
        <Form.Item name="maxTrafficBytes" label="Max Traffic (bytes, 0 = unlimited)">
          <Input placeholder="0" />
        </Form.Item>
        {tenant && (
          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="suspended">Suspended</Select.Option>
              <Select.Option value="deleted">Deleted</Select.Option>
            </Select>
          </Form.Item>
        )}
        <Form.Item name="expiresAt" label="Expires At">
          <DatePicker className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
