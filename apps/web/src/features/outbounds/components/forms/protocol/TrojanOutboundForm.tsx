import { Form, Input, InputNumber } from 'antd';

export function TrojanOutboundForm() {
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
          <InputNumber min={1} max={65535} className="w-full" placeholder="443" />
        </Form.Item>
      </div>
      <Form.Item 
        name={['settings', 'servers', 0, 'password']} 
        label="Password" 
        rules={[{ required: true, message: 'Password is required' }]}
      >
        <Input.Password placeholder="Trojan password" />
      </Form.Item>
      <Form.Item 
        name={['settings', 'servers', 0, 'email']} 
        label="Email (Optional)"
        tooltip="For traffic statistics"
      >
        <Input placeholder="user@example.com" />
      </Form.Item>
    </>
  );
}
