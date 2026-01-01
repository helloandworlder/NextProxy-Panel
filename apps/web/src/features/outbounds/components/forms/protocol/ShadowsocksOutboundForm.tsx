import { Form, Input, InputNumber, Select } from 'antd';

const SS_METHODS = [
  { label: '2022-blake3-aes-256-gcm', value: '2022-blake3-aes-256-gcm' },
  { label: '2022-blake3-aes-128-gcm', value: '2022-blake3-aes-128-gcm' },
  { label: '2022-blake3-chacha20-poly1305', value: '2022-blake3-chacha20-poly1305' },
  { label: 'aes-256-gcm', value: 'aes-256-gcm' },
  { label: 'aes-128-gcm', value: 'aes-128-gcm' },
  { label: 'chacha20-poly1305', value: 'chacha20-poly1305' },
  { label: 'chacha20-ietf-poly1305', value: 'chacha20-ietf-poly1305' },
  { label: 'xchacha20-poly1305', value: 'xchacha20-poly1305' },
  { label: 'xchacha20-ietf-poly1305', value: 'xchacha20-ietf-poly1305' },
  { label: 'none', value: 'none' },
  { label: 'plain', value: 'plain' },
];

export function ShadowsocksOutboundForm() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'servers', 0, 'address']} 
          label="Server Address" 
          rules={[{ required: true, message: 'Server address is required' }]}
        >
          <Input placeholder="server.example.com" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'servers', 0, 'port']} 
          label="Port" 
          rules={[{ required: true, message: 'Port is required' }]}
        >
          <InputNumber min={1} max={65535} className="w-full" placeholder="8388" />
        </Form.Item>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'servers', 0, 'method']} 
          label="Encryption Method" 
          rules={[{ required: true, message: 'Method is required' }]}
        >
          <Select placeholder="Select method">
            {SS_METHODS.map((m) => (
              <Select.Option key={m.value} value={m.value}>{m.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item 
          name={['settings', 'servers', 0, 'password']} 
          label="Password" 
          rules={[{ required: true, message: 'Password is required' }]}
        >
          <Input.Password placeholder="Password" />
        </Form.Item>
      </div>
      <Form.Item 
        name={['settings', 'servers', 0, 'email']} 
        label="Email (Optional)"
        tooltip="For traffic statistics"
      >
        <Input placeholder="user@example.com" />
      </Form.Item>
      <Form.Item 
        name={['settings', 'servers', 0, 'uot']} 
        label="UDP over TCP"
        tooltip="Enable UDP over TCP for better UDP support"
        valuePropName="checked"
      >
        <Select allowClear placeholder="Disabled">
          <Select.Option value={true}>Enabled</Select.Option>
          <Select.Option value={false}>Disabled</Select.Option>
        </Select>
      </Form.Item>
    </>
  );
}
