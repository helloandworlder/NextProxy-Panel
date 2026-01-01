import { Form, Input, Select, Divider } from 'antd';

const NETWORK_OPTIONS = [
  { label: 'UDP (Default)', value: '' },
  { label: 'TCP', value: 'TCP' },
  { label: 'DoH', value: 'DoH' },
];

export function DnsOutboundForm() {
  return (
    <>
      <Divider orientation="left" plain>DNS Outbound Settings</Divider>

      <Form.Item 
        name={['settings', 'network']} 
        label="Network"
        tooltip="DNS query transport protocol"
      >
        <Select options={NETWORK_OPTIONS} placeholder="UDP (Default)" allowClear />
      </Form.Item>

      <Form.Item 
        name={['settings', 'address']} 
        label="DNS Server Address"
        tooltip="DNS server address (e.g., 8.8.8.8, https://dns.google/dns-query)"
      >
        <Input placeholder="8.8.8.8 or https://dns.google/dns-query" />
      </Form.Item>

      <Form.Item 
        name={['settings', 'port']} 
        label="Port"
        tooltip="DNS server port (default: 53 for UDP/TCP, 443 for DoH)"
      >
        <Input placeholder="53" />
      </Form.Item>

      <Form.Item 
        name={['settings', 'nonIPQuery']} 
        label="Non-IP Query"
        tooltip="How to handle non-IP queries (e.g., AAAA when only IPv4 is needed)"
      >
        <Select allowClear placeholder="Default">
          <Select.Option value="drop">Drop</Select.Option>
          <Select.Option value="skip">Skip</Select.Option>
        </Select>
      </Form.Item>
    </>
  );
}
