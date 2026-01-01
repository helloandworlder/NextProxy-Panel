import { Modal, Button, Input, Select, App, Space, Tooltip } from 'antd';
import { CopyOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { Client } from '@/shared/types';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

type Format = 'clash' | 'v2ray' | 'singbox' | 'shadowrocket' | 'surge' | 'link' | 'json';

const FORMAT_OPTIONS = [
  { value: 'clash', label: 'Clash / Clash Meta' },
  { value: 'v2ray', label: 'V2Ray (Base64)' },
  { value: 'singbox', label: 'Sing-box' },
  { value: 'shadowrocket', label: 'Shadowrocket' },
  { value: 'surge', label: 'Surge' },
  { value: 'link', label: 'Plain Links' },
  { value: 'json', label: 'JSON' },
];

export function SubscriptionModal({ open, client, onClose }: Props) {
  const [format, setFormat] = useState<Format>('clash');
  const [showQR, setShowQR] = useState(true);
  const { message } = App.useApp();

  if (!client?.subId) return null;

  const baseUrl = window.location.origin;
  const subUrl = `${baseUrl}/api/sub/${client.subId}?format=${format}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(subUrl);
    message.success('Subscription URL copied');
  };

  const handleDownload = () => {
    const ext = format === 'clash' ? 'yaml' : format === 'singbox' || format === 'json' ? 'json' : 'txt';
    const link = document.createElement('a');
    link.href = subUrl;
    link.download = `${client.email}-${format}.${ext}`;
    link.click();
  };

  return (
    <Modal 
      title={`Subscription - ${client.email}`} 
      open={open} 
      onCancel={onClose} 
      footer={null} 
      width={520}
    >
      <div className="mb-4">
        <label className="block text-sm mb-1 font-medium">Export Format</label>
        <Select 
          value={format} 
          onChange={setFormat} 
          className="w-full"
          options={FORMAT_OPTIONS}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm mb-1 font-medium">Subscription URL</label>
        <Space.Compact className="w-full">
          <Input value={subUrl} readOnly style={{ width: 'calc(100% - 96px)' }} />
          <Tooltip title="Copy URL">
            <Button icon={<CopyOutlined />} onClick={handleCopy} />
          </Tooltip>
          <Tooltip title="Download Config">
            <Button icon={<DownloadOutlined />} onClick={handleDownload} />
          </Tooltip>
          <Tooltip title="Toggle QR Code">
            <Button 
              icon={<QrcodeOutlined />} 
              onClick={() => setShowQR(!showQR)}
              type={showQR ? 'primary' : 'default'}
            />
          </Tooltip>
        </Space.Compact>
      </div>

      {showQR && (
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG value={subUrl} size={200} level="M" />
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>Tip: Use Clash/Sing-box format for best compatibility with Reality protocol.</p>
      </div>
    </Modal>
  );
}
