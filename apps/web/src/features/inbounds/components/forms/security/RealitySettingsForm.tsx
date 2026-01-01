import { Form, Input, Select, Button, Space, InputNumber, Switch, Divider, Collapse } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

// Generate X25519 key pair (placeholder - in production use API)
function generateShortId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const FINGERPRINTS = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' },
  { label: 'Safari', value: 'safari' },
  { label: 'iOS', value: 'ios' },
  { label: 'Android', value: 'android' },
  { label: 'Edge', value: 'edge' },
  { label: 'Random', value: 'random' },
  { label: 'Randomized', value: 'randomized' },
];

export function RealitySettingsForm() {
  const form = Form.useFormInstance();

  const addShortId = () => {
    const current = form.getFieldValue(['streamSettings', 'realitySettings', 'shortIds']) || [];
    form.setFieldValue(['streamSettings', 'realitySettings', 'shortIds'], [...current, generateShortId()]);
  };

  return (
    <>
      <Divider orientation="left" plain>Reality Settings</Divider>
      
      <Form.Item 
        name={['streamSettings', 'realitySettings', 'dest']} 
        label="Dest (Target)"
        rules={[{ required: true, message: 'Dest is required' }]}
        tooltip="Target website for Reality handshake"
      >
        <Input placeholder="www.microsoft.com:443" />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'realitySettings', 'serverNames']} 
        label="Server Names (SNI)"
        rules={[{ required: true, message: 'At least one server name is required' }]}
      >
        <Select mode="tags" placeholder="Enter server names (e.g., www.microsoft.com)" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'realitySettings', 'privateKey']} 
          label="Private Key"
          rules={[{ required: true, message: 'Private key is required' }]}
          tooltip="X25519 private key"
        >
          <Input.Password placeholder="X25519 private key" />
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'realitySettings', 'publicKey']} 
          label="Public Key"
          tooltip="X25519 public key (for client config)"
        >
          <Input placeholder="X25519 public key" />
        </Form.Item>
      </div>

      <Form.Item 
        name={['streamSettings', 'realitySettings', 'shortIds']} 
        label={
          <Space>
            <span>Short IDs</span>
            <Button size="small" icon={<SyncOutlined />} onClick={addShortId}>Add</Button>
          </Space>
        }
        rules={[{ required: true, message: 'At least one short ID is required' }]}
      >
        <Select mode="tags" placeholder="Enter short IDs (hex, 0-16 chars)" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'realitySettings', 'fingerprint']} 
          label="Fingerprint"
          initialValue="chrome"
        >
          <Select>
            {FINGERPRINTS.map((f) => (
              <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'realitySettings', 'spiderX']} 
          label="SpiderX"
          initialValue=""
        >
          <Input placeholder="/" />
        </Form.Item>
      </div>

      <Collapse size="small" ghost>
        <Collapse.Panel header="Advanced Reality Settings" key="advanced">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'realitySettings', 'xver']} 
              label="PROXY Protocol Version"
              tooltip="0=off, 1=v1, 2=v2"
            >
              <Select allowClear placeholder="0">
                <Select.Option value={0}>0 (Off)</Select.Option>
                <Select.Option value={1}>1 (v1)</Select.Option>
                <Select.Option value={2}>2 (v2)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'realitySettings', 'maxTimeDiff']} 
              label="Max Time Diff (ms)"
              tooltip="Maximum allowed time difference"
            >
              <InputNumber min={0} className="w-full" placeholder="0" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'realitySettings', 'minClientVer']} 
              label="Min Client Version"
              tooltip="Minimum allowed client version (e.g., 1.8.0)"
            >
              <Input placeholder="1.8.0" />
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'realitySettings', 'maxClientVer']} 
              label="Max Client Version"
              tooltip="Maximum allowed client version"
            >
              <Input placeholder="" />
            </Form.Item>
          </div>

          <Form.Item 
            name={['streamSettings', 'realitySettings', 'show']} 
            label="Show Debug Info"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Collapse.Panel>
      </Collapse>
    </>
  );
}
