import { Form, Input, Switch, InputNumber, Divider, Collapse } from 'antd';

export function GrpcStreamForm() {
  return (
    <>
      <Divider orientation="left" plain>gRPC Settings</Divider>
      
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'grpcSettings', 'serviceName']} 
          label="Service Name"
          initialValue=""
        >
          <Input placeholder="GunService" />
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'grpcSettings', 'authority']} 
          label="Authority"
          tooltip="Override :authority header"
        >
          <Input placeholder="example.com" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['streamSettings', 'grpcSettings', 'multiMode']} 
        label="Multi Mode"
        valuePropName="checked"
        initialValue={false}
        tooltip="Enable gRPC multi-mode for better performance"
      >
        <Switch />
      </Form.Item>

      <Collapse size="small" ghost>
        <Collapse.Panel header="Advanced Settings" key="advanced">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'grpcSettings', 'idle_timeout']} 
              label="Idle Timeout (s)"
              tooltip="Connection idle timeout"
            >
              <InputNumber min={0} className="w-full" placeholder="60" />
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'grpcSettings', 'health_check_timeout']} 
              label="Health Check Timeout (s)"
            >
              <InputNumber min={0} className="w-full" placeholder="20" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'grpcSettings', 'initial_windows_size']} 
              label="Initial Window Size"
              tooltip="HTTP/2 initial window size"
            >
              <InputNumber min={0} className="w-full" placeholder="0" />
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'grpcSettings', 'permit_without_stream']} 
              label="Permit Without Stream"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>
          <Form.Item 
            name={['streamSettings', 'grpcSettings', 'user_agent']} 
            label="User Agent"
          >
            <Input placeholder="Custom user agent" />
          </Form.Item>
        </Collapse.Panel>
      </Collapse>
    </>
  );
}
