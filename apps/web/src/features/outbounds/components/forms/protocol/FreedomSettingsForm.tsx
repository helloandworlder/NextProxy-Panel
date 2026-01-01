import { Form, Input, Select } from 'antd';

const DOMAIN_STRATEGIES = [
  { label: 'AsIs (No resolution)', value: 'AsIs' },
  { label: 'UseIP (Resolve to IP)', value: 'UseIP' },
  { label: 'UseIPv4', value: 'UseIPv4' },
  { label: 'UseIPv6', value: 'UseIPv6' },
  { label: 'UseIPv4v6', value: 'UseIPv4v6' },
  { label: 'UseIPv6v4', value: 'UseIPv6v4' },
  { label: 'ForceIP', value: 'ForceIP' },
  { label: 'ForceIPv4', value: 'ForceIPv4' },
  { label: 'ForceIPv6', value: 'ForceIPv6' },
  { label: 'ForceIPv4v6', value: 'ForceIPv4v6' },
  { label: 'ForceIPv6v4', value: 'ForceIPv6v4' },
];

export function FreedomSettingsForm() {
  return (
    <>
      <Form.Item 
        name={['settings', 'domainStrategy']} 
        label="Domain Strategy"
        tooltip="How to handle domain names"
      >
        <Select placeholder="Select strategy" allowClear>
          {DOMAIN_STRATEGIES.map((s) => (
            <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item 
        name={['settings', 'redirect']} 
        label="Redirect"
        tooltip="Redirect all traffic to specified address"
      >
        <Input placeholder="e.g., 127.0.0.1:3366" />
      </Form.Item>
      <Form.Item 
        name={['settings', 'userLevel']} 
        label="User Level"
        tooltip="User level for policy matching"
      >
        <Input type="number" placeholder="0" />
      </Form.Item>
    </>
  );
}
