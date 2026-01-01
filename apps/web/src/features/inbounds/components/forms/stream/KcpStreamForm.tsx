import { Form, Input, InputNumber, Select, Switch, Collapse } from 'antd';

const KCP_HEADER_TYPES = [
  { label: 'None', value: 'none' },
  { label: 'SRTP (Video)', value: 'srtp' },
  { label: 'uTP (BitTorrent)', value: 'utp' },
  { label: 'wechat-video', value: 'wechat-video' },
  { label: 'DTLS 1.2', value: 'dtls' },
  { label: 'WireGuard', value: 'wireguard' },
];

export function KcpStreamForm() {
  return (
    <Collapse size="small" className="mb-4">
      <Collapse.Panel header="KCP Settings" key="kcp">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'mtu']} 
            label="MTU"
            initialValue={1350}
            tooltip="Maximum Transmission Unit (576-1460)"
          >
            <InputNumber min={576} max={1460} className="w-full" />
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'tti']} 
            label="TTI (ms)"
            initialValue={50}
            tooltip="Transmission Time Interval (10-100)"
          >
            <InputNumber min={10} max={100} className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'uplinkCapacity']} 
            label="Uplink Capacity (MB/s)"
            initialValue={5}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'downlinkCapacity']} 
            label="Downlink Capacity (MB/s)"
            initialValue={20}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'readBufferSize']} 
            label="Read Buffer (MB)"
            initialValue={2}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'writeBufferSize']} 
            label="Write Buffer (MB)"
            initialValue={2}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'header', 'type']} 
            label="Header Type"
            initialValue="none"
          >
            <Select>
              {KCP_HEADER_TYPES.map((h) => (
                <Select.Option key={h.value} value={h.value}>{h.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item 
            name={['streamSettings', 'kcpSettings', 'congestion']} 
            label="Congestion Control"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>

        <Form.Item 
          name={['streamSettings', 'kcpSettings', 'seed']} 
          label="Seed (Encryption Key)"
          tooltip="Optional encryption seed for obfuscation"
        >
          <Input placeholder="Optional seed for encryption" />
        </Form.Item>
      </Collapse.Panel>
    </Collapse>
  );
}
