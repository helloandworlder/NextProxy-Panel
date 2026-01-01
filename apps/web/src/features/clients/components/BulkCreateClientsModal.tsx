import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Switch, DatePicker, Select, Divider, Space, Alert } from 'antd';
import dayjs from 'dayjs';
import { useInbounds } from '@/features/inbounds/hooks/useInbounds';
import { useOutbounds } from '@/features/outbounds/hooks/useOutbounds';
import { apiClient } from '@/shared/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface BulkCreateRequest {
  emailMethod: number;
  firstNum?: number;
  lastNum?: number;
  emailPrefix?: string;
  emailPostfix?: string;
  quantity?: number;
  totalBytes?: number;
  expiryTime?: number;
  limitIp?: number;
  reset?: number;
  delayedStart?: boolean;
  tgId?: string;
  inboundTags?: string[];
  outboundTag?: string;
}

// Email generation methods (3x-ui style)
const emailMethods = [
  { value: 0, label: 'Random (e.g., abc12345)' },
  { value: 1, label: 'Prefix + Random (e.g., user_abc123)' },
  { value: 2, label: 'Random + Prefix + Number (e.g., ab_user_1)' },
  { value: 3, label: 'Random + Prefix + Number + Postfix (e.g., ab_user_1_vip)' },
  { value: 4, label: 'Prefix + Number + Postfix (e.g., user_1_vip)' },
];

// Traffic reset period options
const resetOptions = [
  { label: 'Never', value: 0 },
  { label: 'Daily', value: 1 },
  { label: 'Weekly', value: 7 },
  { label: 'Monthly', value: 30 },
  { label: 'Yearly', value: 365 },
];

export function BulkCreateClientsModal({ open, onClose }: Props) {
  const [form] = Form.useForm<BulkCreateRequest & { expiryDate?: dayjs.Dayjs }>();
  const queryClient = useQueryClient();
  const { data: inbounds } = useInbounds();
  const { data: outbounds } = useOutbounds();
  const [emailMethod, setEmailMethod] = useState(0);

  const { mutate: bulkCreate, isPending } = useMutation({
    mutationFn: async (data: BulkCreateRequest) => {
      const res = await apiClient.post('/clients/bulk', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      Modal.success({
        title: 'Bulk Create Success',
        content: `Successfully created ${data.created} clients.`,
      });
      onClose();
    },
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const data: BulkCreateRequest = {
      emailMethod: values.emailMethod,
      firstNum: values.firstNum,
      lastNum: values.lastNum,
      emailPrefix: values.emailPrefix,
      emailPostfix: values.emailPostfix,
      quantity: values.quantity,
      totalBytes: values.totalBytes ? values.totalBytes * 1024 * 1024 * 1024 : 0,
      expiryTime: values.expiryDate ? Math.floor(values.expiryDate.valueOf() / 1000) : 0,
      limitIp: values.limitIp || 0,
      reset: values.reset || 0,
      delayedStart: values.delayedStart || false,
      tgId: values.tgId,
      inboundTags: values.inboundTags || [],
      outboundTag: values.outboundTag,
    };
    bulkCreate(data);
  };

  const inboundOptions = inbounds?.map(i => ({ label: `${i.tag} (${i.protocol})`, value: i.tag })) || [];
  const outboundOptions = outbounds?.map(o => ({ label: `${o.tag} (${o.protocol})`, value: o.tag })) || [];

  // Show number range for methods 2,3,4
  const showNumberRange = emailMethod > 1;
  // Show quantity for methods 0,1
  const showQuantity = emailMethod <= 1;

  return (
    <Modal 
      title="Bulk Create Clients" 
      open={open} 
      onCancel={onClose} 
      onOk={handleSubmit} 
      confirmLoading={isPending} 
      width={600}
    >
      <Alert 
        message="Batch create multiple clients with auto-generated emails" 
        type="info" 
        showIcon 
        className="mb-4"
      />
      
      <Form form={form} layout="vertical" initialValues={{ emailMethod: 0, quantity: 10, firstNum: 1, lastNum: 10, reset: 0 }}>
        <Divider orientation="left" plain>Email Generation</Divider>
        
        <Form.Item name="emailMethod" label="Email Generation Method" rules={[{ required: true }]}>
          <Select options={emailMethods} onChange={setEmailMethod} />
        </Form.Item>

        {emailMethod > 0 && (
          <Form.Item name="emailPrefix" label="Email Prefix">
            <Input placeholder="e.g., user_" />
          </Form.Item>
        )}

        {emailMethod >= 3 && (
          <Form.Item name="emailPostfix" label="Email Postfix">
            <Input placeholder="e.g., _vip" />
          </Form.Item>
        )}

        {showQuantity && (
          <Form.Item name="quantity" label="Number of Clients" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
        )}

        {showNumberRange && (
          <Space className="w-full" size="middle">
            <Form.Item name="firstNum" label="Start Number" rules={[{ required: true }]} className="flex-1">
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="lastNum" label="End Number" rules={[{ required: true }]} className="flex-1">
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </Space>
        )}

        <Divider orientation="left" plain>Limits</Divider>

        <Form.Item name="totalBytes" label="Traffic Quota (GB)" tooltip="0 = unlimited">
          <InputNumber min={0} className="w-full" placeholder="0" />
        </Form.Item>

        <Form.Item name="reset" label="Traffic Reset Period">
          <Select options={resetOptions} />
        </Form.Item>

        <Form.Item name="expiryDate" label="Expiry Date" tooltip="Leave empty for no expiry">
          <DatePicker className="w-full" showTime />
        </Form.Item>

        <Form.Item name="delayedStart" label="Delayed Start" valuePropName="checked" tooltip="Start expiry countdown on first connection">
          <Switch />
        </Form.Item>

        <Form.Item name="limitIp" label="Max Concurrent IPs" tooltip="0 = unlimited">
          <InputNumber min={0} className="w-full" placeholder="0" />
        </Form.Item>

        <Divider orientation="left" plain>Routing</Divider>

        <Form.Item name="inboundTags" label="Inbound Access">
          <Select mode="multiple" placeholder="Select inbounds" options={inboundOptions} allowClear />
        </Form.Item>

        <Form.Item name="outboundTag" label="Outbound Binding">
          <Select placeholder="Default routing" options={outboundOptions} allowClear />
        </Form.Item>

        <Divider orientation="left" plain>Notifications</Divider>

        <Form.Item name="tgId" label="Telegram Chat ID">
          <Input placeholder="e.g., 123456789" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
