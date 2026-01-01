import { Form, Input, Select, Switch, InputNumber, Divider, Collapse } from 'antd';

const FINGERPRINTS = [
  { label: 'None', value: '' },
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' },
  { label: 'Safari', value: 'safari' },
  { label: 'iOS', value: 'ios' },
  { label: 'Android', value: 'android' },
  { label: 'Edge', value: 'edge' },
  { label: '360', value: '360' },
  { label: 'QQ', value: 'qq' },
  { label: 'Random', value: 'random' },
  { label: 'Randomized', value: 'randomized' },
];

const TLS_VERSIONS = [
  { label: 'TLS 1.0', value: '1.0' },
  { label: 'TLS 1.1', value: '1.1' },
  { label: 'TLS 1.2', value: '1.2' },
  { label: 'TLS 1.3', value: '1.3' },
];

export function TlsSettingsForm() {
  return (
    <>
      <Divider orientation="left" plain>TLS Settings</Divider>
      
      <Form.Item 
        name={['streamSettings', 'tlsSettings', 'serverName']} 
        label="Server Name (SNI)"
      >
        <Input placeholder="example.com" />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'tlsSettings', 'alpn']} 
        label="ALPN"
        initialValue={['h2', 'http/1.1']}
      >
        <Select mode="tags" placeholder="Select ALPN">
          <Select.Option value="h2">h2</Select.Option>
          <Select.Option value="http/1.1">http/1.1</Select.Option>
          <Select.Option value="h3">h3</Select.Option>
        </Select>
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'tlsSettings', 'certificates', 0, 'certificateFile']} 
          label="Certificate File"
        >
          <Input placeholder="/path/to/cert.pem" />
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'tlsSettings', 'certificates', 0, 'keyFile']} 
          label="Key File"
        >
          <Input placeholder="/path/to/key.pem" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['streamSettings', 'tlsSettings', 'fingerprint']} 
          label="Fingerprint"
          initialValue=""
        >
          <Select allowClear>
            {FINGERPRINTS.map((f) => (
              <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item 
          name={['streamSettings', 'tlsSettings', 'allowInsecure']} 
          label="Allow Insecure"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
      </div>

      <Collapse size="small" ghost>
        <Collapse.Panel header="Advanced TLS Settings" key="advanced">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'minVersion']} 
              label="Min TLS Version"
            >
              <Select allowClear placeholder="Auto">
                {TLS_VERSIONS.map((v) => (
                  <Select.Option key={v.value} value={v.value}>{v.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'maxVersion']} 
              label="Max TLS Version"
            >
              <Select allowClear placeholder="Auto">
                {TLS_VERSIONS.map((v) => (
                  <Select.Option key={v.value} value={v.value}>{v.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item 
            name={['streamSettings', 'tlsSettings', 'cipherSuites']} 
            label="Cipher Suites"
            tooltip="Comma-separated cipher suites (TLS 1.2 only)"
          >
            <Input placeholder="TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'enableSessionResumption']} 
              label="Session Resumption"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'disableSystemRoot']} 
              label="Disable System Root"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'rejectUnknownSni']} 
              label="Reject Unknown SNI"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item 
              name={['streamSettings', 'tlsSettings', 'certificates', 0, 'ocspStapling']} 
              label="OCSP Stapling (hours)"
            >
              <InputNumber min={0} className="w-full" placeholder="3600" />
            </Form.Item>
          </div>
        </Collapse.Panel>
      </Collapse>
    </>
  );
}
