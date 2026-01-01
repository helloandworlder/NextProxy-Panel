import { Form, Input, Select, Switch, InputNumber } from 'antd';

const NETWORK_OPTIONS = [
  { label: 'TCP', value: 'tcp' },
  { label: 'UDP', value: 'udp' },
  { label: 'TCP & UDP', value: 'tcp,udp' },
];

export function DokodemoSettingsForm() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'address']} 
          label="Target Address"
          tooltip="Destination address for forwarding"
        >
          <Input placeholder="e.g., 1.2.3.4 or example.com" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'port']} 
          label="Target Port"
        >
          <InputNumber min={1} max={65535} className="w-full" placeholder="443" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['settings', 'network']} 
        label="Network"
        initialValue="tcp"
      >
        <Select>
          {NETWORK_OPTIONS.map((n) => (
            <Select.Option key={n.value} value={n.value}>{n.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'followRedirect']} 
          label="Follow Redirect"
          valuePropName="checked"
          tooltip="Use destination from TProxy/redirect"
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
    </>
  );
}
