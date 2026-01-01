import { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, Button, Table, Space, message, Typography } from 'antd';
import { DownloadOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { goseaApi, SinglePortMultiEgressRequest, SinglePortMultiEgressPreviewItem } from '../api/goseaApi';
import type { Node, EgressIp } from '@/shared/types';

const { Text } = Typography;

interface BatchGenerateModalProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  onSuccess?: () => void;
}

export function BatchGenerateModal({ open, onClose, nodes, onSuccess }: BatchGenerateModalProps) {
  const [form] = Form.useForm();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [previewData, setPreviewData] = useState<SinglePortMultiEgressPreviewItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const generateMutation = useMutation({
    mutationFn: (data: SinglePortMultiEgressRequest) => goseaApi.generateSinglePortMultiEgress(data),
    onSuccess: (result) => {
      if (result.created) {
        message.success(`Successfully created ${result.totalCount} proxies`);
        onSuccess?.();
        handleClose();
      } else {
        setPreviewData(result.preview);
        setShowPreview(true);
      }
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to generate proxies');
    },
  });

  const handleNodeChange = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    setSelectedNode(node || null);
    form.setFieldValue('egressIps', []);
    setPreviewData([]);
    setShowPreview(false);
  };

  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      generateMutation.mutate({
        nodeId: values.nodeId,
        port: values.port,
        egressIps: values.egressIps,
        countPerIp: values.countPerIp,
        expiresAt: values.expiresAt?.toISOString(),
        dryRun: true,
      });
    } catch {
      // validation error
    }
  };

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      generateMutation.mutate({
        nodeId: values.nodeId,
        port: values.port,
        egressIps: values.egressIps,
        countPerIp: values.countPerIp,
        expiresAt: values.expiresAt?.toISOString(),
        dryRun: false,
      });
    } catch {
      // validation error
    }
  };

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    if (previewData.length === 0) return;
    
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(previewData, null, 2);
      filename = 'proxies.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      const header = 'username,password,egressIp,proxyUrl';
      const rows = previewData.map(p => `${p.username},${p.password},${p.egressIp},${p.proxyUrl}`);
      content = [header, ...rows].join('\n');
      filename = 'proxies.csv';
      mimeType = 'text/csv';
    } else {
      content = previewData.map(p => p.proxyUrl).join('\n');
      filename = 'proxies.txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedNode(null);
    setPreviewData([]);
    setShowPreview(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setPreviewData([]);
      setShowPreview(false);
    }
  }, [open]);

  const egressIpOptions = (selectedNode?.egressIps || [])
    .filter((ip: EgressIp) => ip.isActive)
    .map((ip: EgressIp) => ({ value: ip.ip, label: `${ip.ip} (${ip.ipType || 'datacenter'})` }));

  const previewColumns = [
    { title: 'Username', dataIndex: 'username', key: 'username', width: 180 },
    { title: 'Password', dataIndex: 'password', key: 'password', width: 150 },
    { title: 'Egress IP', dataIndex: 'egressIp', key: 'egressIp', width: 130 },
    { title: 'Proxy URL', dataIndex: 'proxyUrl', key: 'proxyUrl', ellipsis: true },
  ];

  return (
    <Modal
      title="Batch Generate Single-Port Multi-Egress Proxies"
      open={open}
      onCancel={handleClose}
      width={900}
      footer={null}
    >
      <Form form={form} layout="vertical" initialValues={{ port: 1080, countPerIp: 5 }}>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="nodeId" label="Node" rules={[{ required: true }]}>
            <Select
              placeholder="Select a node"
              onChange={handleNodeChange}
              options={nodes.filter(n => n.status === 'online').map(n => ({
                value: n.id,
                label: `${n.name} (${n.publicIp || 'No IP'})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="port" label="Socks5 Port" rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} className="w-full" />
          </Form.Item>

          <Form.Item name="egressIps" label="Egress IPs" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              placeholder="Select egress IPs"
              options={egressIpOptions}
              disabled={!selectedNode}
            />
          </Form.Item>

          <Form.Item name="countPerIp" label="Count per IP" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>

          <Form.Item name="expiresAt" label="Expires At">
            <DatePicker className="w-full" showTime />
          </Form.Item>
        </div>

        <div className="flex justify-between items-center mt-4 mb-4">
          <Space>
            <Button icon={<EyeOutlined />} onClick={handlePreview} loading={generateMutation.isPending}>
              Preview
            </Button>
            {previewData.length > 0 && (
              <>
                <Button icon={<DownloadOutlined />} onClick={() => handleExport('txt')}>Export TXT</Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>Export CSV</Button>
                <Button icon={<DownloadOutlined />} onClick={() => handleExport('json')}>Export JSON</Button>
              </>
            )}
          </Space>
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleConfirm}
              loading={generateMutation.isPending}
              disabled={previewData.length === 0}
            >
              Confirm & Create
            </Button>
          </Space>
        </div>
      </Form>

      {showPreview && previewData.length > 0 && (
        <div>
          <Text type="secondary" className="mb-2 block">
            Preview: {previewData.length} proxies will be created
          </Text>
          <Table
            columns={previewColumns}
            dataSource={previewData}
            rowKey="username"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ y: 300 }}
          />
        </div>
      )}
    </Modal>
  );
}
