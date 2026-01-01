import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Tabs, Segmented, Collapse, Divider } from 'antd';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useCreateOutbound, useUpdateOutbound } from '../hooks/useOutbounds';
import { outboundSettingsTemplates, streamSettingsTemplates } from '@/shared/templates';
import {
  FreedomSettingsForm, BlackholeSettingsForm,
  VmessOutboundForm, VlessOutboundForm, TrojanOutboundForm, ShadowsocksOutboundForm,
  WireGuardOutboundForm, DnsOutboundForm, LoopbackOutboundForm, SocksOutboundForm, HttpOutboundForm,
  TcpStreamForm, WebSocketStreamForm, GrpcStreamForm, HttpUpgradeStreamForm, KcpStreamForm, SplitHttpStreamForm, QuicStreamForm,
  TlsSettingsForm, RealitySettingsForm,
} from './forms';
import type { Outbound, CreateOutboundRequest } from '../api/outboundsApi';

interface Props {
  open: boolean;
  outbound: Outbound | null;
  onClose: () => void;
}

const PROTOCOLS = ['freedom', 'blackhole', 'dns', 'socks', 'http', 'vmess', 'vless', 'trojan', 'shadowsocks', 'wireguard', 'loopback'];
const NETWORKS = ['tcp', 'ws', 'grpc', 'httpupgrade', 'kcp', 'splithttp', 'quic', 'h2'];
type FormMode = 'structured' | 'json';

export function OutboundFormModal({ open, outbound, onClose }: Props) {
  const [form] = Form.useForm<CreateOutboundRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes } = useNodes();
  const { mutate: createOutbound, isPending: creating } = useCreateOutbound();
  const { mutate: updateOutbound, isPending: updating } = useUpdateOutbound();
  
  const protocol = Form.useWatch('protocol', form);
  const network = Form.useWatch(['streamSettings', 'network'], form) || 'tcp';
  const security = Form.useWatch(['streamSettings', 'security'], form) || 'none';
  const isEdit = !!outbound;

  // Check if protocol supports stream settings
  const supportsStream = ['vmess', 'vless', 'trojan', 'shadowsocks'].includes(protocol);
  const supportsReality = protocol === 'vless';

  useEffect(() => {
    if (open) {
      if (outbound) {
        form.setFieldsValue({
          nodeId: outbound.nodeId, tag: outbound.tag, protocol: outbound.protocol,
          sendThrough: outbound.sendThrough, priority: outbound.priority,
          enable: outbound.enable, remark: outbound.remark,
          settings: outbound.settings as object,
          streamSettings: outbound.streamSettings as object || { network: 'tcp', security: 'none' },
          proxySettings: outbound.proxySettings as object,
          muxSettings: outbound.muxSettings as object,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          enable: true, priority: 100, 
          settings: {},
          streamSettings: { network: 'tcp', security: 'none' },
        });
      }
    }
  }, [open, outbound, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (outbound) {
      updateOutbound({ id: outbound.id, data: values }, { onSuccess: onClose });
    } else {
      createOutbound(values, { onSuccess: onClose });
    }
  };

  const applyTemplate = (field: string, config: object) => form.setFieldsValue({ [field]: config });

  return (
    <Modal title={outbound ? 'Edit Outbound' : 'Add Outbound'} open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={creating || updating} width={700} destroyOnClose>
      <Form form={form} layout="vertical">
        {/* Basic Fields */}
        <Form.Item name="nodeId" label="Node" rules={[{ required: true }]}>
          <Select placeholder="Select node" disabled={isEdit}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="tag" label="Tag" rules={[{ required: true }]}>
            <Input placeholder="e.g., direct" />
          </Form.Item>
          <Form.Item name="protocol" label="Protocol" rules={[{ required: true }]}>
            <Select placeholder="Select protocol" disabled={isEdit}>
              {PROTOCOLS.map((p) => <Select.Option key={p} value={p}>{p.toUpperCase()}</Select.Option>)}
            </Select>
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="sendThrough" label="Send Through (IP)">
            <Input placeholder="e.g., 192.168.1.100" />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </div>

        {/* Mode Switcher */}
        <div className="mb-4 flex justify-end">
          <Segmented 
            options={[
              { label: 'Structured', value: 'structured' },
              { label: 'JSON', value: 'json' },
            ]} 
            value={formMode} 
            onChange={(v) => setFormMode(v as FormMode)} 
          />
        </div>

        {formMode === 'structured' ? (
          /* Structured Mode - Protocol Adaptive */
          <>
            {/* Protocol Settings */}
            {protocol === 'freedom' && <FreedomSettingsForm />}
            {protocol === 'blackhole' && <BlackholeSettingsForm />}
            {protocol === 'vmess' && <VmessOutboundForm />}
            {protocol === 'vless' && <VlessOutboundForm />}
            {protocol === 'trojan' && <TrojanOutboundForm />}
            {protocol === 'shadowsocks' && <ShadowsocksOutboundForm />}
            {protocol === 'wireguard' && <WireGuardOutboundForm />}
            {protocol === 'dns' && <DnsOutboundForm />}
            {protocol === 'loopback' && <LoopbackOutboundForm />}
            {protocol === 'socks' && <SocksOutboundForm />}
            {protocol === 'http' && <HttpOutboundForm />}
            {!protocol && <div className="text-gray-400 text-center py-4">Select a protocol first</div>}

            {/* Stream Settings */}
            {supportsStream && (
              <>
                <Divider orientation="left" plain>Transport</Divider>
                <Form.Item name={['streamSettings', 'network']} label="Network" initialValue="tcp">
                  <Select>
                    {NETWORKS.map((n) => <Select.Option key={n} value={n}>{n.toUpperCase()}</Select.Option>)}
                  </Select>
                </Form.Item>

                {/* Network-specific settings */}
                {network === 'tcp' && <TcpStreamForm />}
                {network === 'ws' && <WebSocketStreamForm />}
                {network === 'grpc' && <GrpcStreamForm />}
                {network === 'httpupgrade' && <HttpUpgradeStreamForm />}
                {network === 'kcp' && <KcpStreamForm />}
                {network === 'splithttp' && <SplitHttpStreamForm />}
                {network === 'quic' && <QuicStreamForm />}

                <Divider orientation="left" plain>Security</Divider>
                <Form.Item name={['streamSettings', 'security']} label="Security" initialValue="none">
                  <Select>
                    <Select.Option value="none">None</Select.Option>
                    <Select.Option value="tls">TLS</Select.Option>
                    {supportsReality && <Select.Option value="reality">Reality</Select.Option>}
                  </Select>
                </Form.Item>

                {security === 'tls' && <TlsSettingsForm />}
                {security === 'reality' && <RealitySettingsForm />}

                {/* Mux Settings */}
                <Collapse size="small" className="mb-4">
                  <Collapse.Panel header="Mux Settings" key="mux">
                    <MuxSettingsFields />
                  </Collapse.Panel>
                </Collapse>
              </>
            )}
          </>
        ) : (
          <JsonModeFields templates={{ settings: outboundSettingsTemplates, stream: streamSettingsTemplates }} onApply={applyTemplate} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="remark" label="Remark">
            <Input placeholder="Optional notes" />
          </Form.Item>
          <Form.Item name="enable" label="Enable" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function MuxSettingsFields() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Form.Item name={['muxSettings', 'enabled']} label="Enable Mux" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name={['muxSettings', 'concurrency']} label="Concurrency" initialValue={8}>
        <InputNumber min={1} max={1024} className="w-full" />
      </Form.Item>
    </div>
  );
}

function JsonModeFields({ templates, onApply }: { templates: { settings: any[]; stream: any[] }; onApply: (field: string, config: object) => void }) {
  return (
    <>
      <Form.Item label="Settings">
        <Tabs size="small" items={[
          { key: 'editor', label: 'JSON', children: <Form.Item name="settings" noStyle><JsonEditor height={150} /></Form.Item> },
          { key: 'tpl', label: 'Templates', children: (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {templates.settings.map((tpl, i) => (
                <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm" onClick={() => onApply('settings', tpl.config)}>{tpl.name}</div>
              ))}
            </div>
          )},
        ]} />
      </Form.Item>
      <Form.Item label="Stream Settings">
        <Tabs size="small" items={[
          { key: 'editor', label: 'JSON', children: <Form.Item name="streamSettings" noStyle><JsonEditor height={150} /></Form.Item> },
          { key: 'tpl', label: 'Templates', children: (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {templates.stream.map((tpl, i) => (
                <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm" onClick={() => onApply('streamSettings', tpl.config)}>{tpl.name}</div>
              ))}
            </div>
          )},
        ]} />
      </Form.Item>
      <Form.Item name="muxSettings" label="Mux Settings (JSON)">
        <JsonEditor placeholder='{"enabled": true, "concurrency": 8}' height={80} />
      </Form.Item>
    </>
  );
}
