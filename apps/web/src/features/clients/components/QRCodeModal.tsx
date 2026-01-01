import { useState, useMemo } from 'react';
import { Modal, Select, Space, Button, Input, message, Tag, Descriptions, Tooltip } from 'antd';
import { CopyOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import type { Client } from '@/shared/types';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

interface InboundConfig {
  tag: string;
  protocol: string;
  port: number;
  host: string;
  network?: string;
  security?: string;
  path?: string;
  sni?: string;
}

// Generate VLESS link
function generateVlessLink(client: Client, inbound: InboundConfig): string {
  const uuid = client.uuid || '';
  const params = new URLSearchParams();
  params.set('type', inbound.network || 'tcp');
  params.set('security', inbound.security || 'none');
  if (inbound.path) params.set('path', inbound.path);
  if (inbound.sni) params.set('sni', inbound.sni);
  params.set('encryption', 'none');
  
  const remark = encodeURIComponent(client.email || 'client');
  return `vless://${uuid}@${inbound.host}:${inbound.port}?${params.toString()}#${remark}`;
}

// Generate VMess link (v2rayN format)
function generateVmessLink(client: Client, inbound: InboundConfig): string {
  const config = {
    v: '2',
    ps: client.email || 'client',
    add: inbound.host,
    port: String(inbound.port),
    id: client.uuid || '',
    aid: '0',
    scy: 'auto',
    net: inbound.network || 'tcp',
    type: 'none',
    host: inbound.sni || '',
    path: inbound.path || '',
    tls: inbound.security === 'tls' ? 'tls' : '',
    sni: inbound.sni || '',
  };
  return `vmess://${btoa(JSON.stringify(config))}`;
}

// Generate Trojan link
function generateTrojanLink(client: Client, inbound: InboundConfig): string {
  const password = client.password || client.uuid || '';
  const params = new URLSearchParams();
  params.set('type', inbound.network || 'tcp');
  if (inbound.sni) params.set('sni', inbound.sni);
  params.set('security', inbound.security || 'tls');
  
  const remark = encodeURIComponent(client.email || 'client');
  return `trojan://${password}@${inbound.host}:${inbound.port}?${params.toString()}#${remark}`;
}

// Generate Shadowsocks link
function generateShadowsocksLink(client: Client, inbound: InboundConfig): string {
  const method = client.method || 'aes-256-gcm';
  const password = client.password || '';
  const userinfo = btoa(`${method}:${password}`);
  const remark = encodeURIComponent(client.email || 'client');
  return `ss://${userinfo}@${inbound.host}:${inbound.port}#${remark}`;
}

export function QRCodeModal({ open, client, onClose }: Props) {
  const [selectedProtocol, setSelectedProtocol] = useState<string>('vless');
  
  // Mock inbound config - in real app, this would come from API
  const mockInbound: InboundConfig = useMemo(() => ({
    tag: 'inbound-1',
    protocol: selectedProtocol,
    port: 443,
    host: window.location.hostname,
    network: 'tcp',
    security: 'tls',
    sni: window.location.hostname,
  }), [selectedProtocol]);

  const link = useMemo(() => {
    if (!client) return '';
    switch (selectedProtocol) {
      case 'vless': return generateVlessLink(client, mockInbound);
      case 'vmess': return generateVmessLink(client, mockInbound);
      case 'trojan': return generateTrojanLink(client, mockInbound);
      case 'shadowsocks': return generateShadowsocksLink(client, mockInbound);
      default: return '';
    }
  }, [client, selectedProtocol, mockInbound]);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    message.success('Link copied to clipboard');
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${client?.email || 'qrcode'}.png`;
      a.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!client) return null;

  return (
    <Modal
      title={<Space><QrcodeOutlined />Connection Info - {client.email}</Space>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <div className="space-y-4">
        {/* Protocol Selector */}
        <div className="flex items-center gap-2">
          <span>Protocol:</span>
          <Select
            value={selectedProtocol}
            onChange={setSelectedProtocol}
            style={{ width: 150 }}
            options={[
              { label: 'VLESS', value: 'vless' },
              { label: 'VMess', value: 'vmess' },
              { label: 'Trojan', value: 'trojan' },
              { label: 'Shadowsocks', value: 'shadowsocks' },
            ]}
          />
        </div>

        {/* Client Info */}
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Email">{client.email}</Descriptions.Item>
          <Descriptions.Item label="UUID">
            <Tooltip title={client.uuid}>
              <span className="font-mono text-xs">{client.uuid?.slice(0, 8)}...</span>
            </Tooltip>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={client.enable ? 'green' : 'red'}>{client.enable ? 'Enabled' : 'Disabled'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Protocol">
            <Tag color="blue">{selectedProtocol.toUpperCase()}</Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG id="qr-code-svg" value={link} size={200} level="M" includeMargin />
        </div>

        {/* Link */}
        <Input.TextArea value={link} rows={3} readOnly className="font-mono text-xs" />

        {/* Actions */}
        <div className="flex justify-center gap-2">
          <Button icon={<CopyOutlined />} onClick={handleCopy}>Copy Link</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadQR}>Download QR</Button>
        </div>
      </div>
    </Modal>
  );
}
