import { useEffect, useState } from 'react';
import { Modal, Form, Select, Switch, Segmented, Collapse, Button, InputNumber, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import { useCreatePolicyConfig, useUpdatePolicyConfig } from '../hooks/usePolicyConfig';
import type { PolicyConfig, CreatePolicyConfigRequest } from '../api/policyConfigApi';

interface Props {
  open: boolean;
  onClose: () => void;
  policyConfig?: PolicyConfig | null;
}

type FormMode = 'structured' | 'json';

const defaultPolicyConfig = {
  levels: {
    '0': { statsUserUplink: true, statsUserDownlink: true },
  },
  system: {
    statsInboundUplink: true,
    statsInboundDownlink: true,
    statsOutboundUplink: true,
    statsOutboundDownlink: true,
  },
};

export function PolicyConfigFormModal({ open, onClose, policyConfig }: Props) {
  const [form] = Form.useForm<CreatePolicyConfigRequest>();
  const [formMode, setFormMode] = useState<FormMode>('structured');
  const { data: nodes = [] } = useNodes();
  const { mutate: create, isPending: isCreating } = useCreatePolicyConfig();
  const { mutate: update, isPending: isUpdating } = useUpdatePolicyConfig();

  useEffect(() => {
    if (open) {
      if (policyConfig) {
        form.setFieldsValue({
          nodeId: policyConfig.nodeId,
          policyConfig: policyConfig.policyConfig as object,
          enable: policyConfig.enable,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ enable: true, policyConfig: defaultPolicyConfig });
      }
    }
  }, [open, policyConfig, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (policyConfig) {
      update({ id: policyConfig.id, data: values }, { onSuccess: onClose });
    } else {
      create(values, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      title={policyConfig ? 'Edit Policy Config' : 'Create Policy Config'}
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
            disabled={!!policyConfig}
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
          <StructuredPolicyFields />
        ) : (
          <Form.Item name="policyConfig" label="Policy Config (JSON)" rules={[{ required: true }]}>
            <JsonEditor height={300} />
          </Form.Item>
        )}

        <Form.Item name="enable" label="Enable" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function StructuredPolicyFields() {
  return (
    <Collapse size="small" className="mb-4" defaultActiveKey={['system', 'levels']}>
      {/* System Stats */}
      <Collapse.Panel header="System Statistics" key="system">
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name={['policyConfig', 'system', 'statsInboundUplink']}
            label="Stats Inbound Uplink"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['policyConfig', 'system', 'statsInboundDownlink']}
            label="Stats Inbound Downlink"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['policyConfig', 'system', 'statsOutboundUplink']}
            label="Stats Outbound Uplink"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name={['policyConfig', 'system', 'statsOutboundDownlink']}
            label="Stats Outbound Downlink"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </div>
      </Collapse.Panel>

      {/* User Levels */}
      <Collapse.Panel header="User Levels" key="levels">
        <LevelsList />
      </Collapse.Panel>
    </Collapse>
  );
}

function LevelsList() {
  const [levels, setLevels] = useState<number[]>([0]);

  const addLevel = () => {
    const nextLevel = Math.max(...levels) + 1;
    if (nextLevel <= 255) {
      setLevels([...levels, nextLevel]);
    }
  };

  const removeLevel = (level: number) => {
    if (levels.length > 1) {
      setLevels(levels.filter((l) => l !== level));
    }
  };

  return (
    <>
      {levels.map((level) => (
        <div key={level} className="border rounded p-3 mb-3 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Level {level}</span>
            {levels.length > 1 && (
              <DeleteOutlined className="text-red-500 cursor-pointer" onClick={() => removeLevel(level)} />
            )}
          </div>

          <Divider className="my-2" plain>Timeout Settings</Divider>
          <div className="grid grid-cols-2 gap-2">
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'handshake']}
              label="Handshake (s)"
              className="mb-2"
              initialValue={4}
            >
              <InputNumber min={0} size="small" className="w-full" />
            </Form.Item>
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'connIdle']}
              label="Conn Idle (s)"
              className="mb-2"
              initialValue={300}
            >
              <InputNumber min={0} size="small" className="w-full" />
            </Form.Item>
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'uplinkOnly']}
              label="Uplink Only (s)"
              className="mb-2"
              initialValue={2}
            >
              <InputNumber min={0} size="small" className="w-full" />
            </Form.Item>
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'downlinkOnly']}
              label="Downlink Only (s)"
              className="mb-2"
              initialValue={5}
            >
              <InputNumber min={0} size="small" className="w-full" />
            </Form.Item>
          </div>

          <Divider className="my-2" plain>Statistics & Buffer</Divider>
          <div className="grid grid-cols-3 gap-2">
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'statsUserUplink']}
              label="Stats Uplink"
              valuePropName="checked"
              className="mb-0"
              initialValue={true}
            >
              <Switch size="small" />
            </Form.Item>
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'statsUserDownlink']}
              label="Stats Downlink"
              valuePropName="checked"
              className="mb-0"
              initialValue={true}
            >
              <Switch size="small" />
            </Form.Item>
            <Form.Item
              name={['policyConfig', 'levels', String(level), 'bufferSize']}
              label="Buffer (KB)"
              className="mb-0"
            >
              <InputNumber min={0} size="small" className="w-full" placeholder="Auto" />
            </Form.Item>
          </div>
        </div>
      ))}
      <Button type="dashed" onClick={addLevel} block icon={<PlusOutlined />} disabled={levels.length >= 256}>
        Add Level
      </Button>
    </>
  );
}
