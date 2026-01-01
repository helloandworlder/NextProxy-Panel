import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, DatePicker, Select, Divider, Space, Tooltip, Tabs } from 'antd';
import { SyncOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCreateClient, useUpdateClient } from '../hooks/useClients';
import { useInbounds } from '@/features/inbounds/hooks/useInbounds';
import { useOutbounds } from '@/features/outbounds/hooks/useOutbounds';
import type { Client, CreateClientRequest } from '@/shared/types';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

// Generate random UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate random email
function generateEmail(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export function ClientFormModal({ open, client, onClose }: Props) {
  const [form] = Form.useForm<CreateClientRequest & { expiryDate?: dayjs.Dayjs }>();
  const { mutate: createClient, isPending: creating } = useCreateClient();
  const { mutate: updateClient, isPending: updating } = useUpdateClient();
  const { data: inbounds } = useInbounds();
  const { data: outbounds } = useOutbounds();

  useEffect(() => {
    if (open) {
      if (client) {
        form.setFieldsValue({
          email: client.email,
          uuid: client.uuid,
          totalBytes: client.totalBytes ? client.totalBytes / (1024 * 1024 * 1024) : 0,
          expiryDate: client.expiryTime ? dayjs(client.expiryTime * 1000) : undefined,
          uploadLimit: client.uploadLimit ? client.uploadLimit / (1024 * 1024) : 0,
          downloadLimit: client.downloadLimit ? client.downloadLimit / (1024 * 1024) : 0,
          deviceLimit: client.deviceLimit,
          // 3x-ui style fields
          limitIp: client.limitIp || 0,
          reset: client.reset || 0,
          delayedStart: client.delayedStart || false,
          tgId: client.tgId || '',
          comment: client.comment || '',
          inboundTags: client.inboundTags || [],
          outboundTag: client.outboundTag,
          remark: client.remark,
          enable: client.enable,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          enable: true,
          uuid: generateUUID(),
          email: generateEmail(),
          limitIp: 0,
          reset: 0,
          delayedStart: false,
        });
      }
    }
  }, [open, client, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const data: CreateClientRequest = {
      email: values.email,
      uuid: values.uuid,
      totalBytes: values.totalBytes ? values.totalBytes * 1024 * 1024 * 1024 : 0,
      expiryTime: values.expiryDate ? Math.floor(values.expiryDate.valueOf() / 1000) : 0,
      uploadLimit: values.uploadLimit ? values.uploadLimit * 1024 * 1024 : 0,
      downloadLimit: values.downloadLimit ? values.downloadLimit * 1024 * 1024 : 0,
      deviceLimit: values.deviceLimit || 0,
      // 3x-ui style fields
      limitIp: values.limitIp || 0,
      reset: values.reset || 0,
      delayedStart: values.delayedStart || false,
      tgId: values.tgId || undefined,
      comment: values.comment || undefined,
      inboundTags: values.inboundTags || [],
      outboundTag: values.outboundTag,
      remark: values.remark,
      enable: values.enable,
    };
    if (client) {
      updateClient({ id: client.id, data }, { onSuccess: onClose });
    } else {
      createClient(data, { onSuccess: onClose });
    }
  };

  // Get unique inbound tags
  const inboundOptions = inbounds?.map(i => ({ label: `${i.tag} (${i.protocol})`, value: i.tag })) || [];
  const outboundOptions = outbounds?.map(o => ({ label: `${o.tag} (${o.protocol})`, value: o.tag })) || [];

  // Traffic reset period options
  const resetOptions = [
    { label: 'Never', value: 0 },
    { label: 'Daily', value: 1 },
    { label: 'Weekly', value: 7 },
    { label: 'Monthly', value: 30 },
    { label: 'Yearly', value: 365 },
  ];

  return (
    <Modal title={client ? 'Edit Client' : 'Add Client'} open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={creating || updating} width={600}>
      <Form form={form} layout="vertical">
        <Tabs defaultActiveKey="basic" items={[
          {
            key: 'basic',
            label: 'Basic',
            children: (
              <>
                <Form.Item name="enable" label="Enable" valuePropName="checked">
                  <Switch />
                </Form.Item>
                
                <Form.Item name="email" label="Email/ID" rules={[{ required: true, message: 'Please input email' }]}>
                  <Input 
                    placeholder="user@example.com" 
                    disabled={!!client}
                    addonAfter={!client && <SyncOutlined onClick={() => form.setFieldsValue({ email: generateEmail() })} style={{ cursor: 'pointer' }} />}
                  />
                </Form.Item>

                <Form.Item name="uuid" label="UUID" tooltip="Used for VLESS/VMess protocols">
                  <Input 
                    placeholder="Auto-generated UUID"
                    addonAfter={
                      <Space>
                        <Tooltip title="Generate new UUID">
                          <SyncOutlined onClick={() => form.setFieldsValue({ uuid: generateUUID() })} style={{ cursor: 'pointer' }} />
                        </Tooltip>
                        <Tooltip title="Copy UUID">
                          <CopyOutlined onClick={() => navigator.clipboard.writeText(form.getFieldValue('uuid') || '')} style={{ cursor: 'pointer' }} />
                        </Tooltip>
                      </Space>
                    }
                  />
                </Form.Item>

                <Form.Item name="remark" label="Remark">
                  <Input placeholder="Optional display name" />
                </Form.Item>

                <Form.Item name="comment" label="Comment" tooltip="Internal notes (not shown to user)">
                  <Input.TextArea rows={2} placeholder="Internal notes" />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'limits',
            label: 'Limits',
            children: (
              <>
                <Form.Item name="totalBytes" label="Traffic Quota (GB)" tooltip="0 = unlimited">
                  <InputNumber min={0} className="w-full" placeholder="0" />
                </Form.Item>

                <Form.Item name="reset" label="Traffic Reset Period" tooltip="Automatically reset traffic usage">
                  <Select options={resetOptions} />
                </Form.Item>

                <Form.Item name="expiryDate" label="Expiry Date" tooltip="Leave empty for no expiry">
                  <DatePicker className="w-full" showTime />
                </Form.Item>

                <Form.Item name="delayedStart" label="Delayed Start" valuePropName="checked" tooltip="Start expiry countdown on first connection">
                  <Switch />
                </Form.Item>

                <Divider orientation="left" plain>Speed & Device Limits</Divider>

                <Space className="w-full" size="middle">
                  <Form.Item name="uploadLimit" label="Upload (MB/s)" tooltip="0 = unlimited" className="flex-1">
                    <InputNumber min={0} className="w-full" placeholder="0" />
                  </Form.Item>
                  <Form.Item name="downloadLimit" label="Download (MB/s)" tooltip="0 = unlimited" className="flex-1">
                    <InputNumber min={0} className="w-full" placeholder="0" />
                  </Form.Item>
                </Space>

                <Space className="w-full" size="middle">
                  <Form.Item name="deviceLimit" label="Max Devices" tooltip="0 = unlimited" className="flex-1">
                    <InputNumber min={0} className="w-full" placeholder="0" />
                  </Form.Item>
                  <Form.Item name="limitIp" label="Max IPs" tooltip="Concurrent IP limit, 0 = unlimited" className="flex-1">
                    <InputNumber min={0} className="w-full" placeholder="0" />
                  </Form.Item>
                </Space>
              </>
            ),
          },
          {
            key: 'routing',
            label: 'Routing',
            children: (
              <>
                <Form.Item name="inboundTags" label="Inbound Access" tooltip="Select which inbounds this client can access">
                  <Select
                    mode="multiple"
                    placeholder="Select inbounds (leave empty for all)"
                    options={inboundOptions}
                    allowClear
                  />
                </Form.Item>

                <Form.Item name="outboundTag" label="Outbound Binding" tooltip="Route this client's traffic to specific outbound">
                  <Select
                    placeholder="Default routing"
                    options={outboundOptions}
                    allowClear
                  />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'notifications',
            label: 'Notifications',
            children: (
              <>
                <Form.Item name="tgId" label="Telegram Chat ID" tooltip="Receive notifications via Telegram bot">
                  <Input placeholder="e.g., 123456789" />
                </Form.Item>
              </>
            ),
          },
        ]} />
      </Form>
    </Modal>
  );
}
