import { Form, Input, InputNumber, Select } from 'antd';

const FLOW_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'xtls-rprx-vision', value: 'xtls-rprx-vision' },
  { label: 'xtls-rprx-vision-udp443', value: 'xtls-rprx-vision-udp443' },
];

export function VlessOutboundForm() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'vnext', 0, 'address']} 
          label="Server Address" 
          rules={[{ required: true, message: 'Server address is required' }]}
        >
          <Input placeholder="server.example.com" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'vnext', 0, 'port']} 
          label="Port" 
          rules={[{ required: true, message: 'Port is required' }]}
        >
          <InputNumber min={1} max={65535} className="w-full" placeholder="443" />
        </Form.Item>
      </div>
      <Form.Item 
        name={['settings', 'vnext', 0, 'users', 0, 'id']} 
        label="UUID" 
        rules={[{ required: true, message: 'UUID is required' }]}
      >
        <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'vnext', 0, 'users', 0, 'encryption']} 
          label="Encryption" 
          initialValue="none"
        >
          <Select>
            <Select.Option value="none">none</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item 
          name={['settings', 'vnext', 0, 'users', 0, 'flow']} 
          label="Flow"
          tooltip="XTLS flow control (only for TCP+TLS/Reality)"
        >
          <Select allowClear placeholder="Optional">
            {FLOW_OPTIONS.map((f) => (
              <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>
    </>
  );
}
