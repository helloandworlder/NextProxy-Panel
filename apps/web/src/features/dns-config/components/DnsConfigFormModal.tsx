import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Segmented, Collapse, Button, Space, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useCreateDnsConfig, useUpdateDnsConfig } from '../hooks/useDnsConfig';
import type { DnsConfig, CreateDnsConfigRequest } from '../api/dnsConfigApi';

interface Props {
  open: boolean;
  onClose: () => void;
  dnsConfig?: DnsConfig | null;
}

type FormMode = 'structured' | 'json';

const QUERY_STRATEGIES = [
  { label: 'UseIP (Auto)', value: 'UseIP' },
  { label: 'UseIPv4', value: 'UseIPv4' },
  { label: 'UseIPv6', value: 'UseIPv6' },
];

const defaultDnsConfig = {
  servers: ['8.8.8.8', '1.1.1.1'],
  queryStrategy: 'UseIP',
};

export function DnsConfigFormModal({ open, onClose, dnsConfig }: Props) {
  const [form] = Form.useForm<CreateDnsConfigRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes = [] } = useNodes();
  const { mutate: create, isPending: isCreating } = useCreateDnsConfig();
  const { mutate: update, isPending: isUpdating } = useUpdateDnsConfig();

  useEffect(() => {
    if (open) {
      if (dnsConfig) {
        form.setFieldsValue({
          nodeId: dnsConfig.nodeId,
          dnsConfig: dnsConfig.dnsConfig as object,
          enable: dnsConfig.enable,
          remark: dnsConfig.remark,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ enable: true, dnsConfig: defaultDnsConfig });
      }
    }
  }, [open, dnsConfig, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (dnsConfig) {
      update({ id: dnsConfig.id, data: values }, { onSuccess: onClose });
    } else {
      create(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      title={dnsConfig ? 'Edit DNS Config' : 'Create DNS Config'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isCreating || isUpdating}
      width={750}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nodeId" label="Node" rules={[{ required: true }]}>
          <Select
            placeholder="Select node"
            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
            disabled={!!dnsConfig}
          />
        </Form.Item>

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
          <StructuredDnsFields />
        ) : (
          <Form.Item name="dnsConfig" label="DNS Config (JSON)" rules={[{ required: true }]}>
            <JsonEditor height={300} />
          </Form.Item>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="enable" label="Enable" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="remark" label="Remark">
            <Input placeholder="Optional notes" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

function StructuredDnsFields() {
  return (
    <Collapse size="small" className="mb-4" defaultActiveKey={['basic', 'servers']}>
      {/* Basic Settings */}
      <Collapse.Panel header="Basic Settings" key="basic">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name={['dnsConfig', 'queryStrategy']}
            label="Query Strategy"
            initialValue="UseIP"
          >
            <Select options={QUERY_STRATEGIES} />
          </Form.Item>
          <Form.Item
            name={['dnsConfig', 'tag']}
            label="DNS Tag"
            tooltip="Tag for DNS inbound routing"
          >
            <Input placeholder="dns-inbound" />
          </Form.Item>
        </div>

        <Form.Item
          name={['dnsConfig', 'clientIp']}
          label="Client IP"
          tooltip="IP to use for EDNS Client Subnet"
        >
          <Input placeholder="e.g., 1.2.3.4" />
        </Form.Item>

        <div className="grid grid-cols-3 gap-4">
          <Form.Item
            name={['dnsConfig', 'disableCache']}
            label="Disable Cache"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['dnsConfig', 'disableFallback']}
            label="Disable Fallback"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['dnsConfig', 'disableFallbackIfMatch']}
            label="No Fallback If Match"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>
      </Collapse.Panel>

      {/* DNS Servers */}
      <Collapse.Panel header="DNS Servers" key="servers">
        <Form.List name={['dnsConfig', 'servers']} initialValue={['8.8.8.8']}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <DnsServerItem key={key} name={name} restField={restField} onRemove={() => remove(name)} />
              ))}
              <Button type="dashed" onClick={() => add('8.8.8.8')} block icon={<PlusOutlined />}>
                Add DNS Server
              </Button>
            </>
          )}
        </Form.List>
      </Collapse.Panel>

      {/* Hosts Mapping */}
      <Collapse.Panel header="Hosts Mapping" key="hosts">
        <Form.List name={['dnsConfig', 'hosts']}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <div key={key} className="flex gap-2 mb-2">
                  <Form.Item name={[name, 'domain']} className="flex-1 mb-0">
                    <Input placeholder="domain:google.com" size="small" />
                  </Form.Item>
                  <Form.Item name={[name, 'ip']} className="flex-1 mb-0">
                    <Input placeholder="8.8.8.8" size="small" />
                  </Form.Item>
                  <DeleteOutlined className="text-red-500 cursor-pointer mt-2" onClick={() => remove(name)} />
                </div>
              ))}
              <Button type="dashed" onClick={() => add({ domain: '', ip: '' })} block icon={<PlusOutlined />} size="small">
                Add Host Mapping
              </Button>
            </>
          )}
        </Form.List>
      </Collapse.Panel>
    </Collapse>
  );
}

function DnsServerItem({ name, restField, onRemove }: { name: number; restField: any; onRemove: () => void }) {
  const form = Form.useFormInstance();
  const serverValue = Form.useWatch(['dnsConfig', 'servers', name], form);
  const isAdvanced = typeof serverValue === 'object';
  const [advanced, setAdvanced] = useState(isAdvanced);

  const toggleAdvanced = () => {
    if (!advanced) {
      const current = form.getFieldValue(['dnsConfig', 'servers', name]) || '8.8.8.8';
      form.setFieldValue(['dnsConfig', 'servers', name], { address: current, domains: [], expectIPs: [] });
    } else {
      const current = form.getFieldValue(['dnsConfig', 'servers', name]);
      form.setFieldValue(['dnsConfig', 'servers', name], current?.address || '8.8.8.8');
    }
    setAdvanced(!advanced);
  };

  return (
    <div className="border rounded p-3 mb-2 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <Space>
          <span className="font-medium">Server {name + 1}</span>
          <Button size="small" type="link" onClick={toggleAdvanced}>
            {advanced ? 'Simple' : 'Advanced'}
          </Button>
        </Space>
        <DeleteOutlined className="text-red-500 cursor-pointer" onClick={onRemove} />
      </div>

      {advanced ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Form.Item {...restField} name={[name, 'address']} label="Address" className="mb-2">
              <Input placeholder="8.8.8.8 or https://dns.google/dns-query" size="small" />
            </Form.Item>
            <Form.Item {...restField} name={[name, 'port']} label="Port" className="mb-2">
              <InputNumber min={1} max={65535} placeholder="53" size="small" className="w-full" />
            </Form.Item>
          </div>
          <Form.Item {...restField} name={[name, 'domains']} label="Domains" className="mb-2">
            <Select mode="tags" placeholder="geosite:cn, domain:example.com" size="small" tokenSeparators={[',', '\n']}>
              <Select.Option value="geosite:cn">geosite:cn</Select.Option>
              <Select.Option value="geosite:geolocation-!cn">geosite:geolocation-!cn</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item {...restField} name={[name, 'expectIPs']} label="Expect IPs" className="mb-2">
            <Select mode="tags" placeholder="geoip:cn" size="small" tokenSeparators={[',', '\n']}>
              <Select.Option value="geoip:cn">geoip:cn</Select.Option>
              <Select.Option value="geoip:!cn">geoip:!cn</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item {...restField} name={[name, 'skipFallback']} label="Skip Fallback" valuePropName="checked" className="mb-0">
            <Switch size="small" />
          </Form.Item>
        </>
      ) : (
        <Form.Item {...restField} name={name} className="mb-0">
          <Input placeholder="8.8.8.8 or https://dns.google/dns-query" size="small" />
        </Form.Item>
      )}
    </div>
  );
}
