import { Form, Input, Select, Switch, InputNumber } from 'antd';

const AUTH_TYPES = [
  { label: 'No Auth', value: 'noauth' },
  { label: 'Password', value: 'password' },
];

export function SocksSettingsForm() {
  const auth = Form.useWatch(['settings', 'auth']);

  return (
    <>
      <Form.Item 
        name={['settings', 'auth']} 
        label="Authentication"
        initialValue="noauth"
      >
        <Select>
          {AUTH_TYPES.map((a) => (
            <Select.Option key={a.value} value={a.value}>{a.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      {auth === 'password' && (
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['settings', 'accounts', 0, 'user']} 
            label="Username"
            rules={[{ required: true, message: 'Username required' }]}
          >
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item 
            name={['settings', 'accounts', 0, 'pass']} 
            label="Password"
            rules={[{ required: true, message: 'Password required' }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'udp']} 
          label="UDP Enabled"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
        <Form.Item 
          name={['settings', 'userLevel']} 
          label="User Level"
          initialValue={0}
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['settings', 'ip']} 
        label="UDP IP Address"
        tooltip="IP address for UDP association"
      >
        <Input placeholder="127.0.0.1" />
      </Form.Item>
    </>
  );
}
