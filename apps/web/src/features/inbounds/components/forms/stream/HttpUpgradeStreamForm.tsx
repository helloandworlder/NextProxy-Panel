import { Form, Input, Switch, Divider } from 'antd';

export function HttpUpgradeStreamForm() {
  return (
    <>
      <Divider orientation="left" plain>HTTPUpgrade Settings</Divider>
      
      <Form.Item 
        name={['streamSettings', 'httpupgradeSettings', 'path']} 
        label="Path"
        initialValue="/"
      >
        <Input placeholder="/" />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'httpupgradeSettings', 'host']} 
        label="Host"
      >
        <Input placeholder="example.com" />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'httpupgradeSettings', 'acceptProxyProtocol']} 
        label="Accept PROXY Protocol"
        valuePropName="checked"
        initialValue={false}
      >
        <Switch />
      </Form.Item>
    </>
  );
}
