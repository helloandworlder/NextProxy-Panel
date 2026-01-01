import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker } from 'antd';
import { useCreateApiKey } from '../hooks/useApiKeys';
import type { CreateApiKeyRequest } from '../api/apiKeysApi';

interface Props {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCreated: (key: string) => void;
}

export function ApiKeyFormModal({ open, tenantId, onClose, onCreated }: Props) {
  const [form] = Form.useForm<CreateApiKeyRequest>();
  const { mutate: createKey, isPending } = useCreateApiKey(tenantId);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ scopes: ['*'], rateLimit: 1000 });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createKey(values, {
      onSuccess: (data) => {
        onCreated(data.key);
      },
    });
  };

  return (
    <Modal title="Create API Key" open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={isPending}>
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input key name' }]}>
          <Input placeholder="e.g., Production API Key" />
        </Form.Item>
        <Form.Item name="scopes" label="Scopes">
          <Select mode="tags" placeholder="Enter scopes (e.g., nodes:*, clients:read)">
            <Select.Option value="*">* (All)</Select.Option>
            <Select.Option value="nodes:*">nodes:*</Select.Option>
            <Select.Option value="clients:*">clients:*</Select.Option>
            <Select.Option value="inbounds:*">inbounds:*</Select.Option>
            <Select.Option value="outbounds:*">outbounds:*</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="rateLimit" label="Rate Limit (requests/min)">
          <InputNumber min={1} max={10000} className="w-full" />
        </Form.Item>
        <Form.Item name="expiresAt" label="Expires At">
          <DatePicker className="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
