import { Form, Input, Divider } from 'antd';

export function LoopbackOutboundForm() {
  return (
    <>
      <Divider orientation="left" plain>Loopback Settings</Divider>

      <Form.Item 
        name={['settings', 'inboundTag']} 
        label="Inbound Tag"
        rules={[{ required: true, message: 'Inbound tag is required' }]}
        tooltip="Tag of the inbound to loop back to"
      >
        <Input placeholder="inbound-tag" />
      </Form.Item>
    </>
  );
}
