import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Segmented, Collapse, Divider } from 'antd';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useOutbounds } from '@/features/outbounds/hooks/useOutbounds';
import { useCreateBalancer, useUpdateBalancer } from '../hooks/useBalancers';
import type { Balancer, CreateBalancerRequest } from '../api/balancersApi';

interface Props {
  open: boolean;
  onClose: () => void;
  balancer?: Balancer | null;
}

type FormMode = 'structured' | 'json';

const STRATEGY_TYPES = [
  { label: 'Random', value: 'random' },
  { label: 'Round Robin', value: 'roundRobin' },
  { label: 'Least Ping', value: 'leastPing' },
  { label: 'Least Load', value: 'leastLoad' },
];

const defaultBalancerConfig = {
  selector: [],
  strategy: { type: 'random' },
};

export function BalancerFormModal({ open, onClose, balancer }: Props) {
  const [form] = Form.useForm<CreateBalancerRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes = [] } = useNodes();
  const selectedNodeId = Form.useWatch('nodeId', form);
  const { data: outbounds = [] } = useOutbounds(selectedNodeId);
  const { mutate: create, isPending: isCreating } = useCreateBalancer();
  const { mutate: update, isPending: isUpdating } = useUpdateBalancer();

  useEffect(() => {
    if (open) {
      if (balancer) {
        form.setFieldsValue({
          nodeId: balancer.nodeId,
          tag: balancer.tag,
          balancerConfig: balancer.balancerConfig as object,
          enable: balancer.enable,
          remark: balancer.remark,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ enable: true, balancerConfig: defaultBalancerConfig });
      }
    }
  }, [open, balancer, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (balancer) {
      update({ id: balancer.id, data: values }, { onSuccess: onClose });
    } else {
      create(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      title={balancer ? 'Edit Balancer' : 'Create Balancer'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={isCreating || isUpdating}
      width={700}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nodeId" label="Node" rules={[{ required: true }]}>
          <Select
            placeholder="Select node"
            options={nodes.map((n) => ({ value: n.id, label: n.name }))}
            disabled={!!balancer}
          />
        </Form.Item>

        <Form.Item name="tag" label="Balancer Tag" rules={[{ required: true }]}>
          <Input placeholder="e.g., balancer-us" />
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
          <StructuredBalancerFields outbounds={outbounds} />
        ) : (
          <Form.Item name="balancerConfig" label="Balancer Config (JSON)" rules={[{ required: true }]}>
            <JsonEditor height={200} />
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

function StructuredBalancerFields({ outbounds }: { outbounds: any[] }) {
  return (
    <Collapse size="small" className="mb-4" defaultActiveKey={['selector', 'strategy']}>
      {/* Selector */}
      <Collapse.Panel header="Outbound Selector" key="selector">
        <Form.Item
          name={['balancerConfig', 'selector']}
          label="Select Outbounds"
          tooltip="Select outbound tags or use wildcards like us-*"
          rules={[{ required: true, message: 'At least one selector is required' }]}
        >
          <Select
            mode="tags"
            placeholder="Select outbounds or enter patterns (e.g., us-*, proxy-*)"
            tokenSeparators={[',']}
          >
            {outbounds.map((o) => (
              <Select.Option key={o.tag} value={o.tag}>
                {o.tag} ({o.protocol})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name={['balancerConfig', 'fallbackTag']}
          label="Fallback Outbound"
          tooltip="Outbound to use when all selected outbounds fail"
        >
          <Select allowClear placeholder="Select fallback outbound">
            {outbounds.map((o) => (
              <Select.Option key={o.tag} value={o.tag}>
                {o.tag} ({o.protocol})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Collapse.Panel>

      {/* Strategy */}
      <Collapse.Panel header="Load Balancing Strategy" key="strategy">
        <Form.Item
          name={['balancerConfig', 'strategy', 'type']}
          label="Strategy Type"
          initialValue="random"
        >
          <Select options={STRATEGY_TYPES} />
        </Form.Item>

        <Divider plain className="text-xs text-gray-400">Strategy Descriptions</Divider>
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Random:</strong> Randomly select an outbound</p>
          <p><strong>Round Robin:</strong> Select outbounds in order</p>
          <p><strong>Least Ping:</strong> Select outbound with lowest latency</p>
          <p><strong>Least Load:</strong> Select outbound with lowest load</p>
        </div>
      </Collapse.Panel>
    </Collapse>
  );
}
