import { Form, Input, InputNumber, Select } from 'antd';

const SECURITY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'AES-128-GCM', value: 'aes-128-gcm' },
  { label: 'ChaCha20-Poly1305', value: 'chacha20-poly1305' },
  { label: 'None', value: 'none' },
  { label: 'Zero', value: 'zero' },
];

export function VmessOutboundForm() {
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
          name={['settings', 'vnext', 0, 'users', 0, 'security']} 
          label="Security" 
          initialValue="auto"
        >
          <Select>
            {SECURITY_OPTIONS.map((s) => (
              <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item 
          name={['settings', 'vnext', 0, 'users', 0, 'alterId']} 
          label="Alter ID" 
          initialValue={0}
          tooltip="Legacy VMess compatibility (use 0 for AEAD)"
        >
          <InputNumber min={0} max={65535} className="w-full" />
        </Form.Item>
      </div>
    </>
  );
}
