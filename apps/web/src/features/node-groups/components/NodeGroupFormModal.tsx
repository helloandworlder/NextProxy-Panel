import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Collapse, Tag, Space, Button, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { JsonEditor } from '@/shared/components/JsonEditor';
import { useCreateNodeGroup, useUpdateNodeGroup } from '../hooks/useNodeGroups';
import type { NodeGroup, CreateNodeGroupRequest, SchemaField } from '../api/nodeGroupsApi';

interface Props {
  open: boolean;
  group: NodeGroup | null;
  onClose: () => void;
}

interface TemplateConfig {
  label: string;
  description: string;
  schemaFields: SchemaField[];
  requiredTags: string[];
}

// Predefined templates (must match backend)
const NODE_GROUP_TEMPLATES: Record<string, TemplateConfig> = {
  residential_socks5: {
    label: 'Residential Socks5',
    description: 'For residential proxy nodes with Socks5 protocol',
    schemaFields: [
      { name: 'continent', type: 'select', required: true, options: ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'] },
      { name: 'country', type: 'select', required: true, options: ['US', 'JP', 'HK', 'TW', 'SG', 'KR', 'UK', 'DE', 'FR', 'AU', 'CA', 'NL', 'RU', 'BR', 'IN'] },
      { name: 'city', type: 'string', required: true },
    ],
    requiredTags: ['Residential', 'Socks5-Only'],
  },
  relay: {
    label: 'Relay Node',
    description: 'For relay/transit nodes',
    schemaFields: [
      { name: 'region', type: 'select', required: true, options: ['HK', 'TW', 'JP', 'SG', 'US-West', 'US-East', 'EU', 'KR', 'AU'] },
    ],
    requiredTags: ['Relay'],
  },
  custom: {
    label: 'Custom',
    description: 'Define your own schema and tags',
    schemaFields: [],
    requiredTags: [],
  },
};

const LB_STRATEGIES = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'random', label: 'Random' },
  { value: 'least_load', label: 'Least Load' },
  { value: 'geo_nearest', label: 'Geo Nearest' },
];

type GroupType = keyof typeof NODE_GROUP_TEMPLATES;

export function NodeGroupFormModal({ open, group, onClose }: Props) {
  const [form] = Form.useForm<CreateNodeGroupRequest>();
  const [groupType, setGroupType] = useState<GroupType>('custom');
  const { mutate: createGroup, isPending: creating } = useCreateNodeGroup();
  const { mutate: updateGroup, isPending: updating } = useUpdateNodeGroup();

  useEffect(() => {
    if (open) {
      if (group) {
        const type = (group.groupType as GroupType) || 'custom';
        setGroupType(type);
        form.setFieldsValue({
          name: group.name,
          groupType: type,
          schemaFields: group.schemaFields as any[],
          requiredTags: group.requiredTags as string[],
          lbStrategy: group.lbStrategy,
          lbSettings: group.lbSettings as object,
          healthCheck: group.healthCheck as object,
          remark: group.remark,
        });
      } else {
        form.resetFields();
        setGroupType('custom');
        form.setFieldsValue({ 
          groupType: 'custom',
          lbStrategy: 'round_robin', 
          lbSettings: {}, 
          healthCheck: { enabled: true, interval_seconds: 30 },
          schemaFields: [],
          requiredTags: [],
        });
      }
    }
  }, [open, group, form]);

  const handleTypeChange = (type: GroupType) => {
    setGroupType(type);
    const template = NODE_GROUP_TEMPLATES[type];
    form.setFieldsValue({
      groupType: type,
      schemaFields: template.schemaFields,
      requiredTags: template.requiredTags,
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (group) {
      updateGroup({ id: group.id, data: values }, { onSuccess: onClose });
    } else {
      createGroup(values, { onSuccess: onClose });
    }
  };

  const template = NODE_GROUP_TEMPLATES[groupType];

  return (
    <Modal 
      title={group ? 'Edit Node Group' : 'Add Node Group'} 
      open={open} 
      onCancel={onClose} 
      onOk={handleSubmit} 
      confirmLoading={creating || updating} 
      width={700}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* Basic Info */}
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="e.g., US Residential Nodes" />
        </Form.Item>

        {/* Group Type Selector */}
        <Form.Item name="groupType" label="Group Type" rules={[{ required: true }]}>
          <Select onChange={handleTypeChange} disabled={!!group}>
            {Object.entries(NODE_GROUP_TEMPLATES).map(([key, tpl]) => (
              <Select.Option key={key} value={key}>
                <div>
                  <div className="font-medium">{tpl.label}</div>
                  <div className="text-xs text-gray-400">{tpl.description}</div>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Required Tags Display */}
        {template.requiredTags.length > 0 && (
          <Form.Item label="Required Tags (Auto-applied to nodes)">
            <Space>
              {template.requiredTags.map((tag) => (
                <Tag key={tag} color="blue">{tag}</Tag>
              ))}
            </Space>
          </Form.Item>
        )}

        {/* Schema Fields Preview */}
        {template.schemaFields.length > 0 && (
          <Form.Item label="Node Metadata Schema">
            <div className="border rounded p-3 bg-gray-50">
              {template.schemaFields.map((field: any) => (
                <div key={field.name} className="flex items-center gap-2 mb-1">
                  <Tag color={field.required ? 'red' : 'default'}>{field.required ? 'Required' : 'Optional'}</Tag>
                  <span className="font-medium">{field.name}</span>
                  <span className="text-gray-400">({field.type})</span>
                  {field.options && <span className="text-xs text-gray-400">Options: {field.options.slice(0, 5).join(', ')}...</span>}
                </div>
              ))}
            </div>
          </Form.Item>
        )}

        {/* Custom Schema Editor (only for custom type) */}
        {groupType === 'custom' && (
          <Collapse size="small" className="mb-4">
            <Collapse.Panel header="Custom Schema Fields" key="schema">
              <CustomSchemaEditor />
            </Collapse.Panel>
            <Collapse.Panel header="Custom Required Tags" key="tags">
              <Form.Item name="requiredTags">
                <Select mode="tags" placeholder="Add required tags" />
              </Form.Item>
            </Collapse.Panel>
          </Collapse>
        )}

        <Divider />

        {/* Load Balancing */}
        <Form.Item name="lbStrategy" label="Load Balancing Strategy">
          <Select options={LB_STRATEGIES} />
        </Form.Item>

        <Collapse size="small" className="mb-4">
          <Collapse.Panel header="Advanced Settings" key="advanced">
            <Form.Item name="lbSettings" label="LB Settings (JSON)">
              <JsonEditor placeholder="{}" height={80} />
            </Form.Item>
            <Form.Item name="healthCheck" label="Health Check (JSON)">
              <JsonEditor placeholder='{"enabled": true, "interval_seconds": 30}' height={80} />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>

        <Form.Item name="remark" label="Remark">
          <Input.TextArea rows={2} placeholder="Optional notes" />
        </Form.Item>

        {/* Hidden fields for form submission */}
        <Form.Item name="schemaFields" hidden><Input /></Form.Item>
      </Form>
    </Modal>
  );
}

function CustomSchemaEditor() {
  const form = Form.useFormInstance();
  const schemaFields = Form.useWatch('schemaFields', form) || [];

  const addField = () => {
    form.setFieldsValue({
      schemaFields: [...schemaFields, { name: '', type: 'string', required: false, options: [] }],
    });
  };

  const removeField = (index: number) => {
    const newFields = schemaFields.filter((_: any, i: number) => i !== index);
    form.setFieldsValue({ schemaFields: newFields });
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...schemaFields];
    newFields[index] = { ...newFields[index], [key]: value };
    form.setFieldsValue({ schemaFields: newFields });
  };

  return (
    <>
      {schemaFields.map((field: any, index: number) => (
        <div key={index} className="flex gap-2 mb-2 items-center">
          <Input
            placeholder="Field name"
            value={field.name}
            onChange={(e) => updateField(index, 'name', e.target.value)}
            size="small"
            className="w-32"
          />
          <Select
            value={field.type}
            onChange={(v) => updateField(index, 'type', v)}
            size="small"
            className="w-24"
          >
            <Select.Option value="string">String</Select.Option>
            <Select.Option value="select">Select</Select.Option>
            <Select.Option value="number">Number</Select.Option>
          </Select>
          <Switch
            checked={field.required}
            onChange={(v) => updateField(index, 'required', v)}
            size="small"
            checkedChildren="Req"
            unCheckedChildren="Opt"
          />
          {field.type === 'select' && (
            <Select
              mode="tags"
              placeholder="Options"
              value={field.options || []}
              onChange={(v) => updateField(index, 'options', v)}
              size="small"
              className="flex-1"
            />
          )}
          <DeleteOutlined className="text-red-500 cursor-pointer" onClick={() => removeField(index)} />
        </div>
      ))}
      <Button type="dashed" onClick={addField} block icon={<PlusOutlined />} size="small">
        Add Schema Field
      </Button>
    </>
  );
}
