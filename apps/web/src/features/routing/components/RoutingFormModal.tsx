import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Segmented, Collapse, Tag, Space } from 'antd';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useOutbounds } from '@/features/outbounds/hooks/useOutbounds';
import { useInbounds } from '@/features/inbounds/hooks/useInbounds';
import { useCreateRoutingRule, useUpdateRoutingRule } from '../hooks/useRouting';
import type { RoutingRule, CreateRoutingRuleRequest } from '../api/routingApi';

interface Props {
  open: boolean;
  rule: RoutingRule | null;
  onClose: () => void;
}

type FormMode = 'structured' | 'json';

const DEFAULT_RULE_CONFIG = {
  type: 'field',
  outboundTag: 'direct',
};

// Common routing rule templates
const RULE_TEMPLATES = [
  { name: 'Direct CN', config: { type: 'field', domain: ['geosite:cn'], outboundTag: 'direct' } },
  { name: 'Direct CN IP', config: { type: 'field', ip: ['geoip:cn'], outboundTag: 'direct' } },
  { name: 'Direct Private IP', config: { type: 'field', ip: ['geoip:private'], outboundTag: 'direct' } },
  { name: 'Block Ads', config: { type: 'field', domain: ['geosite:category-ads-all'], outboundTag: 'block' } },
  { name: 'Proxy Foreign', config: { type: 'field', domain: ['geosite:geolocation-!cn'], outboundTag: 'proxy' } },
  { name: 'Block QUIC', config: { type: 'field', network: 'udp', port: '443', outboundTag: 'block' } },
  { name: 'Block BitTorrent', config: { type: 'field', protocol: ['bittorrent'], outboundTag: 'block' } },
  { name: 'Proxy Google', config: { type: 'field', domain: ['geosite:google'], outboundTag: 'proxy' } },
  { name: 'Proxy Telegram', config: { type: 'field', domain: ['geosite:telegram'], ip: ['geoip:telegram'], outboundTag: 'proxy' } },
];

export function RoutingFormModal({ open, rule, onClose }: Props) {
  const [form] = Form.useForm<CreateRoutingRuleRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes } = useNodes();
  const selectedNodeId = Form.useWatch('nodeId', form);
  const { data: outbounds } = useOutbounds(selectedNodeId);
  const { data: inbounds } = useInbounds(selectedNodeId);
  const { mutate: createRule, isPending: creating } = useCreateRoutingRule();
  const { mutate: updateRule, isPending: updating } = useUpdateRoutingRule();

  useEffect(() => {
    if (open) {
      if (rule) {
        form.setFieldsValue({
          nodeId: rule.nodeId,
          ruleTag: rule.ruleTag,
          priority: rule.priority,
          ruleConfig: rule.ruleConfig as object,
          enable: rule.enable,
          remark: rule.remark,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ enable: true, priority: 100, ruleConfig: DEFAULT_RULE_CONFIG });
      }
    }
  }, [open, rule, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (rule) {
      updateRule({ id: rule.id, data: values }, { onSuccess: onClose });
    } else {
      createRule(values, { onSuccess: onClose });
    }
  };

  const applyTemplate = (config: object) => form.setFieldsValue({ ruleConfig: config });

  return (
    <Modal title={rule ? 'Edit Routing Rule' : 'Add Routing Rule'} open={open} onCancel={onClose} onOk={handleSubmit} confirmLoading={creating || updating} width={750} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="nodeId" label="Node" rules={[{ required: true }]}>
          <Select placeholder="Select node" disabled={!!rule}>
            {nodes?.map((n) => <Select.Option key={n.id} value={n.id}>{n.name}</Select.Option>)}
          </Select>
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="ruleTag" label="Rule Tag" rules={[{ required: true }]}>
            <Input placeholder="e.g., block-ads" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" tooltip="Lower number = higher priority">
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
          <StructuredRuleFields outbounds={outbounds} inbounds={inbounds} templates={RULE_TEMPLATES} onApplyTemplate={applyTemplate} />
        ) : (
          <Form.Item name="ruleConfig" label="Rule Config (JSON)" rules={[{ required: true }]} tooltip="Xray routing rule format">
            <JsonEditor placeholder='{"type": "field", "domain": ["geosite:cn"], "outboundTag": "direct"}' height={250} />
          </Form.Item>
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

function StructuredRuleFields({ outbounds, inbounds, templates, onApplyTemplate }: any) {
  return (
    <Collapse size="small" className="mb-4" defaultActiveKey={['match', 'action']}>
      {/* Quick Templates */}
      <Collapse.Panel header="Quick Templates" key="templates">
        <div className="grid grid-cols-3 gap-2">
          {templates.map((tpl: any, i: number) => (
            <div key={i} className="p-2 border rounded cursor-pointer hover:bg-blue-50 text-sm text-center" onClick={() => onApplyTemplate(tpl.config)}>
              {tpl.name}
            </div>
          ))}
        </div>
      </Collapse.Panel>

      {/* Match Conditions - Domain */}
      <Collapse.Panel header="Domain Matching" key="domain">
        <Form.Item 
          name={['ruleConfig', 'domain']} 
          label="Domain Patterns"
          tooltip="geosite:cn, domain:example.com, full:www.example.com, regexp:.*"
        >
          <Select mode="tags" placeholder="Add domain patterns" tokenSeparators={[',', '\n']}>
            <Select.OptGroup label="GeoSite (Common)">
              <Select.Option value="geosite:cn">geosite:cn (China)</Select.Option>
              <Select.Option value="geosite:geolocation-!cn">geosite:geolocation-!cn (Foreign)</Select.Option>
              <Select.Option value="geosite:category-ads-all">geosite:category-ads-all (Ads)</Select.Option>
              <Select.Option value="geosite:private">geosite:private (Private)</Select.Option>
            </Select.OptGroup>
            <Select.OptGroup label="GeoSite (Services)">
              <Select.Option value="geosite:google">geosite:google</Select.Option>
              <Select.Option value="geosite:facebook">geosite:facebook</Select.Option>
              <Select.Option value="geosite:twitter">geosite:twitter</Select.Option>
              <Select.Option value="geosite:youtube">geosite:youtube</Select.Option>
              <Select.Option value="geosite:netflix">geosite:netflix</Select.Option>
              <Select.Option value="geosite:telegram">geosite:telegram</Select.Option>
              <Select.Option value="geosite:openai">geosite:openai</Select.Option>
              <Select.Option value="geosite:github">geosite:github</Select.Option>
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'domainMatcher']} 
          label="Domain Matcher"
          tooltip="Algorithm for domain matching"
        >
          <Select allowClear placeholder="Default (hybrid)">
            <Select.Option value="linear">Linear</Select.Option>
            <Select.Option value="mph">MPH (Memory-efficient)</Select.Option>
            <Select.Option value="hybrid">Hybrid (Default)</Select.Option>
          </Select>
        </Form.Item>
      </Collapse.Panel>

      {/* Match Conditions - IP */}
      <Collapse.Panel header="IP Matching" key="ip">
        <Form.Item 
          name={['ruleConfig', 'ip']} 
          label="Destination IP"
          tooltip="geoip:cn, geoip:private, or CIDR like 10.0.0.0/8"
        >
          <Select mode="tags" placeholder="Add IP patterns" tokenSeparators={[',', '\n']}>
            <Select.OptGroup label="GeoIP">
              <Select.Option value="geoip:cn">geoip:cn (China)</Select.Option>
              <Select.Option value="geoip:private">geoip:private (Private)</Select.Option>
              <Select.Option value="geoip:us">geoip:us (USA)</Select.Option>
              <Select.Option value="geoip:jp">geoip:jp (Japan)</Select.Option>
              <Select.Option value="geoip:hk">geoip:hk (Hong Kong)</Select.Option>
              <Select.Option value="geoip:tw">geoip:tw (Taiwan)</Select.Option>
              <Select.Option value="geoip:sg">geoip:sg (Singapore)</Select.Option>
              <Select.Option value="geoip:telegram">geoip:telegram</Select.Option>
            </Select.OptGroup>
            <Select.OptGroup label="Private CIDR">
              <Select.Option value="10.0.0.0/8">10.0.0.0/8</Select.Option>
              <Select.Option value="172.16.0.0/12">172.16.0.0/12</Select.Option>
              <Select.Option value="192.168.0.0/16">192.168.0.0/16</Select.Option>
              <Select.Option value="127.0.0.0/8">127.0.0.0/8 (Loopback)</Select.Option>
            </Select.OptGroup>
          </Select>
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'source']} 
          label="Source IP"
          tooltip="Match traffic from specific source IPs"
        >
          <Select mode="tags" placeholder="Add source IP patterns" tokenSeparators={[',', '\n']}>
            <Select.Option value="geoip:private">geoip:private</Select.Option>
            <Select.Option value="10.0.0.0/8">10.0.0.0/8</Select.Option>
            <Select.Option value="192.168.0.0/16">192.168.0.0/16</Select.Option>
          </Select>
        </Form.Item>
      </Collapse.Panel>

      {/* Match Conditions - Port & Network */}
      <Collapse.Panel header="Port & Network" key="port">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name={['ruleConfig', 'port']} 
            label="Destination Port"
            tooltip="e.g., 80,443 or 1000-2000"
          >
            <Input placeholder="80,443,8080-8090" />
          </Form.Item>
          <Form.Item 
            name={['ruleConfig', 'sourcePort']} 
            label="Source Port"
          >
            <Input placeholder="1000-65535" />
          </Form.Item>
        </div>

        <Form.Item 
          name={['ruleConfig', 'network']} 
          label="Network"
        >
          <Select allowClear placeholder="Any">
            <Select.Option value="tcp">TCP only</Select.Option>
            <Select.Option value="udp">UDP only</Select.Option>
            <Select.Option value="tcp,udp">TCP & UDP</Select.Option>
          </Select>
        </Form.Item>
      </Collapse.Panel>

      {/* Match Conditions - Protocol & Inbound */}
      <Collapse.Panel header="Protocol & Inbound" key="protocol">
        <Form.Item 
          name={['ruleConfig', 'protocol']} 
          label="Detected Protocol"
          tooltip="Requires sniffing enabled"
        >
          <Select mode="multiple" allowClear placeholder="Any">
            <Select.Option value="http">HTTP</Select.Option>
            <Select.Option value="tls">TLS</Select.Option>
            <Select.Option value="bittorrent">BitTorrent</Select.Option>
            <Select.Option value="quic">QUIC</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'inboundTag']} 
          label="Inbound Tag"
          tooltip="Match traffic from specific inbounds"
        >
          <Select mode="multiple" allowClear placeholder="Any inbound">
            {inbounds?.map((i: any) => <Select.Option key={i.tag} value={i.tag}>{i.tag} ({i.protocol})</Select.Option>)}
          </Select>
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'user']} 
          label="User Email"
          tooltip="Match specific client emails"
        >
          <Select mode="tags" placeholder="Add user emails" tokenSeparators={[',', ' ']} />
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'attrs']} 
          label="Attributes"
          tooltip="Custom attributes for advanced matching"
        >
          <Input placeholder='e.g., {"attr1": "value1"}' />
        </Form.Item>
      </Collapse.Panel>

      {/* Action */}
      <Collapse.Panel header="Action" key="action">
        <Form.Item name={['ruleConfig', 'type']} label="Type" initialValue="field" hidden>
          <Input />
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'outboundTag']} 
          label="Outbound Tag"
          rules={[{ required: true, message: 'Outbound is required' }]}
        >
          <Select placeholder="Select outbound">
            {outbounds?.map((o: any) => (
              <Select.Option key={o.tag} value={o.tag}>
                <Space>
                  <Tag color={o.protocol === 'freedom' ? 'green' : o.protocol === 'blackhole' ? 'red' : 'blue'}>{o.protocol}</Tag>
                  {o.tag}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name={['ruleConfig', 'balancerTag']} 
          label="Balancer Tag (Alternative)"
          tooltip="Use balancer instead of direct outbound"
        >
          <Input placeholder="Optional: balancer tag" />
        </Form.Item>
      </Collapse.Panel>
    </Collapse>
  );
}
