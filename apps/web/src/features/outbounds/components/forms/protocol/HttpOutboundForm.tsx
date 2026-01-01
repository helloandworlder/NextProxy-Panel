import { Form, Input, Divider } from 'antd';

export function HttpOutboundForm() {
  return (
    <>
      <Divider orientation="left" plain>HTTP Outbound Settings</Divider>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'servers', 0, 'address']} 
          label="Server Address"
          rules={[{ required: true, message: 'Server address is required' }]}
        >
          <Input placeholder="127.0.0.1" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'servers', 0, 'port']} 
          label="Port"
          rules={[{ required: true, message: 'Port is required' }]}
        >
          <Input placeholder="8080" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'servers', 0, 'users', 0, 'user']} 
          label="Username"
          tooltip="Optional authentication"
        >
          <Input placeholder="Username (optional)" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'servers', 0, 'users', 0, 'pass']} 
          label="Password"
        >
          <Input.Password placeholder="Password (optional)" />
        </Form.Item>
      </div>
    </>
  );
}
