import { Form, Input, InputNumber, Switch, Collapse } from 'antd';

export function SplitHttpStreamForm() {
  return (
    <Collapse size="small" className="mb-4">
      <Collapse.Panel header="SplitHTTP Settings" key="splithttp">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'splithttpSettings', 'host']} 
            label="Host"
          >
            <Input placeholder="example.com" />
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'splithttpSettings', 'path']} 
            label="Path"
            initialValue="/"
          >
            <Input placeholder="/" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'splithttpSettings', 'scMaxEachPostBytes']} 
            label="Max POST Bytes"
            tooltip="Maximum bytes per POST request"
          >
            <InputNumber min={0} className="w-full" placeholder="1000000" />
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'splithttpSettings', 'scMinPostsIntervalMs']} 
            label="Min POST Interval (ms)"
            tooltip="Minimum interval between POST requests"
          >
            <InputNumber min={0} className="w-full" placeholder="30" />
          </Form.Item>
        </div>

        <Form.Item 
          name={['streamSettings', 'splithttpSettings', 'noSSEHeader']} 
          label="No SSE Header"
          valuePropName="checked"
          tooltip="Disable Server-Sent Events header"
        >
          <Switch />
        </Form.Item>

        <Collapse size="small" ghost>
          <Collapse.Panel header="Xmux Settings (Advanced)" key="xmux">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item 
                name={['streamSettings', 'splithttpSettings', 'xmux', 'maxConcurrency', 'from']} 
                label="Max Concurrency (From)"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item 
                name={['streamSettings', 'splithttpSettings', 'xmux', 'maxConcurrency', 'to']} 
                label="Max Concurrency (To)"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item 
                name={['streamSettings', 'splithttpSettings', 'xmux', 'maxConnections', 'from']} 
                label="Max Connections (From)"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item 
                name={['streamSettings', 'splithttpSettings', 'xmux', 'maxConnections', 'to']} 
                label="Max Connections (To)"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
            <Form.Item 
              name={['streamSettings', 'splithttpSettings', 'xmux', 'hKeepAlivePeriod']} 
              label="Keep Alive Period (ms)"
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      </Collapse.Panel>
    </Collapse>
  );
}
