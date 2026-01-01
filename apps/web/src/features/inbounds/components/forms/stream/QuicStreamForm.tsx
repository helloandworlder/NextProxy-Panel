import { Form, Input, Select, Divider } from 'antd';

const QUIC_SECURITY = [
  { label: 'None', value: 'none' },
  { label: 'AES-128-GCM', value: 'aes-128-gcm' },
  { label: 'ChaCha20-Poly1305', value: 'chacha20-poly1305' },
];

const HEADER_TYPES = [
  { label: 'None', value: 'none' },
  { label: 'SRTP', value: 'srtp' },
  { label: 'uTP', value: 'utp' },
  { label: 'wechat-video', value: 'wechat-video' },
  { label: 'DTLS', value: 'dtls' },
  { label: 'WireGuard', value: 'wireguard' },
];

export function QuicStreamForm() {
  return (
    <>
      <Divider orientation="left" plain>QUIC Settings</Divider>
      
      <Form.Item 
        name={['streamSettings', 'quicSettings', 'security']} 
        label="Security"
        initialValue="none"
        tooltip="QUIC encryption method"
      >
        <Select options={QUIC_SECURITY} />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'quicSettings', 'key']} 
        label="Key"
        tooltip="Encryption key (required if security is not none)"
      >
        <Input.Password placeholder="Encryption key" />
      </Form.Item>

      <Form.Item 
        name={['streamSettings', 'quicSettings', 'header', 'type']} 
        label="Header Type"
        initialValue="none"
        tooltip="Packet header disguise type"
      >
        <Select options={HEADER_TYPES} />
      </Form.Item>
    </>
  );
}
