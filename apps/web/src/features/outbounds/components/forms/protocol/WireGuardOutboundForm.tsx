import { Form, Input, Select, InputNumber, Divider, Button, Space, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { useState } from 'react';

const DOMAIN_STRATEGIES = [
  { label: 'ForceIP', value: 'ForceIP' },
  { label: 'ForceIPv4', value: 'ForceIPv4' },
  { label: 'ForceIPv4v6', value: 'ForceIPv4v6' },
  { label: 'ForceIPv6', value: 'ForceIPv6' },
  { label: 'ForceIPv6v4', value: 'ForceIPv6v4' },
];

interface Peer {
  endpoint: string;
  publicKey: string;
  preSharedKey?: string;
  allowedIPs?: string[];
  keepAlive?: number;
}

export function WireGuardOutboundForm() {
  const form = Form.useFormInstance();
  const [peers, setPeers] = useState<Peer[]>([{ endpoint: '', publicKey: '', allowedIPs: ['0.0.0.0/0', '::/0'] }]);

  const addPeer = () => {
    setPeers([...peers, { endpoint: '', publicKey: '', allowedIPs: ['0.0.0.0/0', '::/0'] }]);
  };

  const removePeer = (index: number) => {
    if (peers.length > 1) {
      setPeers(peers.filter((_, i) => i !== index));
    }
  };

  const generatePrivateKey = () => {
    // Generate a random 32-byte key and base64 encode it
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
  };

  return (
    <>
      <Divider orientation="left" plain>WireGuard Settings</Divider>

      <Form.Item 
        name={['settings', 'secretKey']} 
        label="Private Key"
        rules={[{ required: true, message: 'Private key is required' }]}
        tooltip="WireGuard private key (base64)"
      >
        <Input.Password 
          placeholder="WireGuard private key"
          addonAfter={
            <SyncOutlined 
              onClick={() => form.setFieldValue(['settings', 'secretKey'], generatePrivateKey())} 
              style={{ cursor: 'pointer' }} 
            />
          }
        />
      </Form.Item>

      <Form.Item 
        name={['settings', 'address']} 
        label="Local Address"
        rules={[{ required: true, message: 'At least one address is required' }]}
        tooltip="Local IP addresses (e.g., 10.0.0.2/32, fd00::2/128)"
      >
        <Select mode="tags" placeholder="Enter local addresses" tokenSeparators={[',', ' ']}>
          <Select.Option value="10.0.0.2/32">10.0.0.2/32</Select.Option>
          <Select.Option value="fd00::2/128">fd00::2/128</Select.Option>
        </Select>
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'mtu']} 
          label="MTU"
          initialValue={1420}
        >
          <InputNumber min={576} max={65535} className="w-full" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'domainStrategy']} 
          label="Domain Strategy"
          initialValue="ForceIP"
        >
          <Select options={DOMAIN_STRATEGIES} />
        </Form.Item>
      </div>

      <Form.Item 
        name={['settings', 'reserved']} 
        label="Reserved"
        tooltip="Reserved bytes (3 integers, e.g., 0,0,0)"
      >
        <Input placeholder="0,0,0" />
      </Form.Item>

      {/* Peers */}
      <Collapse size="small" className="mb-4" defaultActiveKey={['peers']}>
        <Collapse.Panel 
          header={
            <Space>
              <span>Peers</span>
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={(e) => { e.stopPropagation(); addPeer(); }}
              />
            </Space>
          } 
          key="peers"
        >
          {peers.map((_, index) => (
            <div key={index} className="border rounded p-3 mb-2 bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Peer {index + 1}</span>
                {peers.length > 1 && (
                  <DeleteOutlined 
                    className="text-red-500 cursor-pointer" 
                    onClick={() => removePeer(index)} 
                  />
                )}
              </div>
              
              <Form.Item 
                name={['settings', 'peers', index, 'endpoint']} 
                label="Endpoint"
                rules={[{ required: true, message: 'Endpoint is required' }]}
                className="mb-2"
              >
                <Input placeholder="server.example.com:51820" size="small" />
              </Form.Item>

              <Form.Item 
                name={['settings', 'peers', index, 'publicKey']} 
                label="Public Key"
                rules={[{ required: true, message: 'Public key is required' }]}
                className="mb-2"
              >
                <Input placeholder="Peer public key (base64)" size="small" />
              </Form.Item>

              <Form.Item 
                name={['settings', 'peers', index, 'preSharedKey']} 
                label="Pre-Shared Key"
                className="mb-2"
              >
                <Input.Password placeholder="Optional pre-shared key" size="small" />
              </Form.Item>

              <Form.Item 
                name={['settings', 'peers', index, 'allowedIPs']} 
                label="Allowed IPs"
                initialValue={['0.0.0.0/0', '::/0']}
                className="mb-2"
              >
                <Select mode="tags" placeholder="Allowed IPs" size="small" tokenSeparators={[',', ' ']}>
                  <Select.Option value="0.0.0.0/0">0.0.0.0/0</Select.Option>
                  <Select.Option value="::/0">::/0</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item 
                name={['settings', 'peers', index, 'keepAlive']} 
                label="Keep Alive (s)"
                className="mb-0"
              >
                <InputNumber min={0} size="small" className="w-full" placeholder="25" />
              </Form.Item>
            </div>
          ))}
        </Collapse.Panel>
      </Collapse>
    </>
  );
}
