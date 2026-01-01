import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Tabs, Segmented, Collapse, Divider } from 'antd';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useCreateInbound, useUpdateInbound } from '../hooks/useInbounds';
import { useI18n } from '@/hooks/useI18n';
import { inboundSettingsTemplates, streamSettingsTemplates, sniffingTemplates } from '@/shared/templates';
import { SniffingFields } from './StructuredInboundFields';
import {
  VlessSettingsForm, VmessSettingsForm, TrojanSettingsForm, ShadowsocksSettingsForm,
  SocksSettingsForm, HttpSettingsForm, DokodemoSettingsForm,
  TcpStreamForm, WebSocketStreamForm, GrpcStreamForm, HttpUpgradeStreamForm, KcpStreamForm, SplitHttpStreamForm, QuicStreamForm,
  TlsSettingsForm, RealitySettingsForm,
} from './forms';
import type { Inbound, CreateInboundRequest } from '../api/inboundsApi';

interface Props {
  open: boolean;
  inbound: Inbound | null;
  onClose: () => void;
}

const PROTOCOLS = ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'dokodemo-door'];
const NETWORKS = ['tcp', 'ws', 'grpc', 'httpupgrade', 'kcp', 'splithttp', 'quic'];
const defaultSniffing = { enabled: true, destOverride: ['http', 'tls'] };
type FormMode = 'structured' | 'json';

export function InboundFormModal({ open, inbound, onClose }: Props) {
  const { t } = useI18n();
  const [form] = Form.useForm<CreateInboundRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes } = useNodes();
  const { mutate: createInbound, isPending: creating } = useCreateInbound();
  const { mutate: updateInbound, isPending: updating } = useUpdateInbound();
  
  const protocol = Form.useWatch('protocol', form);
  const network = Form.useWatch(['streamSettings', 'network'], form) || 'tcp';
  const security = Form.useWatch(['streamSettings', 'security'], form) || 'none';
  const isEdit = !!inbound;

  useEffect(() => {
    if (open) {
      if (inbound) {
        const data = inbound as any;
        form.setFieldsValue({
          nodeId: data.nodeId, tag: data.tag, protocol: data.protocol,
          port: data.port, listen: data.listen, enable: data.enable, remark: data.remark,
          settings: data.settings || {}, 
          streamSettings: data.streamSettings || { network: 'tcp', security: 'none' }, 
          sniffing: data.sniffing,
        } as any);
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          listen: '0.0.0.0', enable: true, 
          settings: {},
          streamSettings: { network: 'tcp', security: 'none' },
          sniffing: defaultSniffing,
        } as any);
      }
    }
  }, [open, inbound, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (inbound) {
      updateInbound({ id: inbound.id, data: values }, { onSuccess: onClose });
    } else {
      createInbound(values, { onSuccess: onClose });
    }
  };

  const applyTemplate = (field: string, config: object) => form.setFieldsValue({ [field]: config });

  // Check if protocol supports stream settings
  const supportsStream = ['vless', 'vmess', 'trojan'].includes(protocol);
  // Check if protocol supports TLS/Reality
  const supportsTls = ['vless', 'vmess', 'trojan'].includes(protocol);
  const supportsReality = protocol === 'vless';

  return (
    <Modal 
      title={inbound ? t('inbounds.editInbound') : t('inbounds.addInbound')} 
      open={open} onCancel={onClose} onOk={handleSubmit} 
      confirmLoading={creating || updating} width={700} destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* Basic Fields */}
        <Form.Item name="nodeId" label={t('inbounds.selectNode')} rules={[{ required: true }]}>
          <Select placeholder={t('inbounds.selectNode')} disabled={isEdit}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="tag" label={t('inbounds.tag')} rules={[{ required: true }]}>
            <Input placeholder="e.g., vless-tcp" />
          </Form.Item>
          <Form.Item name="protocol" label={t('inbounds.protocol')} rules={[{ required: true }]}>
            <Select disabled={isEdit}>
              {PROTOCOLS.map((p) => <Select.Option key={p} value={p}>{p.toUpperCase()}</Select.Option>)}
            </Select>
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="port" label={t('inbounds.port')} rules={[{ required: true }]}>
            <InputNumber min={1} max={65535} className="w-full" />
          </Form.Item>
          <Form.Item name="listen" label={t('inbounds.listen')}>
            <Input placeholder="0.0.0.0" />
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
            {protocol === 'vless' && <VlessSettingsForm isEdit={isEdit} showFallbacks={network === 'tcp' && security !== 'reality'} />}
            {protocol === 'vmess' && <VmessSettingsForm isEdit={isEdit} />}
            {protocol === 'trojan' && <TrojanSettingsForm isEdit={isEdit} />}
            {protocol === 'shadowsocks' && <ShadowsocksSettingsForm isEdit={isEdit} />}
            {protocol === 'socks' && <SocksSettingsForm />}
            {protocol === 'http' && <HttpSettingsForm />}
            {protocol === 'dokodemo-door' && <DokodemoSettingsForm />}

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
              </>
            )}

            {/* Security Settings */}
            {supportsTls && (
              <>
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
              </>
            )}

            {/* Sniffing */}
            <Collapse size="small" className="mb-4">
              <Collapse.Panel header="Sniffing" key="sniffing">
                <SniffingFields />
              </Collapse.Panel>
            </Collapse>
          </>
        ) : (
          /* JSON Mode */
          <JsonModeFields 
            templates={{ settings: inboundSettingsTemplates, stream: streamSettingsTemplates, sniffing: sniffingTemplates }}
            onApply={applyTemplate}
            t={t}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="remark" label={t('common.remark')}><Input /></Form.Item>
          <Form.Item name="enable" label={t('common.enable')} valuePropName="checked"><Switch /></Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function JsonModeFields({ templates, onApply, t }: any) {
  return (
    <>
      <Form.Item label={t('inbounds.settings')}>
        <Tabs size="small" items={[
          { key: 'editor', label: 'JSON', children: <Form.Item name="settings" noStyle><JsonEditor height={150} /></Form.Item> },
          { key: 'tpl', label: t('editor.templates'), children: (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {templates.settings.map((tpl: any, i: number) => (
                <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm" onClick={() => onApply('settings', tpl.config)}>{tpl.name}</div>
              ))}
            </div>
          )},
        ]} />
      </Form.Item>
      <Form.Item label={t('inbounds.streamSettings')}>
        <Tabs size="small" items={[
          { key: 'editor', label: 'JSON', children: <Form.Item name="streamSettings" noStyle><JsonEditor height={150} /></Form.Item> },
          { key: 'tpl', label: t('editor.templates'), children: (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {templates.stream.map((tpl: any, i: number) => (
                <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm" onClick={() => onApply('streamSettings', tpl.config)}>{tpl.name}</div>
              ))}
            </div>
          )},
        ]} />
      </Form.Item>
      <Form.Item label={t('inbounds.sniffing')}>
        <Tabs size="small" items={[
          { key: 'editor', label: 'JSON', children: <Form.Item name="sniffing" noStyle><JsonEditor height={100} /></Form.Item> },
          { key: 'tpl', label: t('editor.templates'), children: (
            <div className="grid grid-cols-2 gap-2">
              {templates.sniffing.map((tpl: any, i: number) => (
                <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm" onClick={() => onApply('sniffing', tpl.config)}>{tpl.name}</div>
              ))}
            </div>
          )},
        ]} />
      </Form.Item>
    </>
  );
}
