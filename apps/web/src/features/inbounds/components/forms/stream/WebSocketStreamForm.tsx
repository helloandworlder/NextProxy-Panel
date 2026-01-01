import { Form, Input, Switch, InputNumber, Divider } from 'antd';

export function WebSocketStreamForm() {
  return (
    <>
      <Divider orientation="left" plain>WebSocket Settings</Divider>
      
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'wsSettings', 'path']} 
          label="Path"
          initialValue="/"
        >
          <Input placeholder="/" />
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'wsSettings', 'host']} 
          label="Host"
        >
          <Input placeholder="example.com" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'wsSettings', 'ed']} 
          label="Early Data (bytes)"
          tooltip="Max early data length for 0-RTT"
        >
          <InputNumber min={0} max={2048} className="w-full" placeholder="2048" />
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'wsSettings', 'heartbeatPeriod']} 
          label="Heartbeat Period (s)"
          tooltip="WebSocket ping interval"
        >
          <InputNumber min={0} className="w-full" placeholder="0" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['streamSettings', 'wsSettings', 'acceptProxyProtocol']} 
        label="Accept PROXY Protocol"
        valuePropName="checked"
        initialValue={false}
      >
        <Switch />
      </Form.Item>
    </>
  );
}
