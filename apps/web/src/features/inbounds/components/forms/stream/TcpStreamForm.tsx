import { Form, Select, Switch, Collapse, Divider } from 'antd';

const TCP_HEADER_TYPES = [
  { label: 'None', value: 'none' },
  { label: 'HTTP', value: 'http' },
];

export function TcpStreamForm() {
  const form = Form.useFormInstance();
  const headerType = Form.useWatch(['streamSettings', 'tcpSettings', 'header', 'type'], form);

  return (
    <>
      <Divider orientation="left" plain>TCP Settings</Divider>
      
      <Form.Item 
        name={['streamSettings', 'tcpSettings', 'header', 'type']} 
        label="Header Type"
        initialValue="none"
      >
        <Select options={TCP_HEADER_TYPES} />
      </Form.Item>

      {headerType === 'http' && (
        <Collapse size="small" className="mb-4">
          <Collapse.Panel header="HTTP Header Settings" key="http">
            <Form.Item 
              name={['streamSettings', 'tcpSettings', 'header', 'request', 'path']} 
              label="Request Path"
              initialValue={['/']}
            >
              <Select mode="tags" placeholder="Enter paths (e.g., /)" />
            </Form.Item>

            <Form.Item 
              name={['streamSettings', 'tcpSettings', 'header', 'request', 'headers', 'Host']} 
              label="Host"
            >
              <Select mode="tags" placeholder="Enter hosts" />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      )}

      <Form.Item 
        name={['streamSettings', 'tcpSettings', 'acceptProxyProtocol']} 
        label="Accept PROXY Protocol"
        valuePropName="checked"
        initialValue={false}
      >
        <Switch />
      </Form.Item>
    </>
  );
}
