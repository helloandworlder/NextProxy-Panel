import { Form, Input, Select, Divider } from 'antd';

const SOCKS_VERSIONS = [
  { label: 'SOCKS5', value: '5' },
  { label: 'SOCKS4', value: '4' },
  { label: 'SOCKS4a', value: '4a' },
];

export function SocksOutboundForm() {
  return (
    <>
      <Divider orientation="left" plain>SOCKS Outbound Settings</Divider>

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
          <Input placeholder="1080" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['settings', 'version']} 
        label="SOCKS Version"
        initialValue="5"
      >
        <Select options={SOCKS_VERSIONS} />
      </Form.Item>

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
