import { useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, InputNumber, Divider, Alert } from 'antd';
import { useCreateNode, useUpdateNode } from '../hooks/useNodes';
import { useNodeGroups } from '@/features/node-groups/hooks/useNodeGroups';
import type { Node, CreateNodeRequest } from '@/shared/types';
import type { SchemaField } from '@/features/node-groups/api/nodeGroupsApi';

interface Props {
  open: boolean;
  node: Node | null;
  onClose: () => void;
}

export function NodeFormModal({ open, node, onClose }: Props) {
  const [form] = Form.useForm<CreateNodeRequest & { groupMeta?: Record<string, unknown> }>();
  const { mutate: createNode, isPending: creating } = useCreateNode();
  const { mutate: updateNode, isPending: updating } = useUpdateNode();
  const { data: nodeGroups } = useNodeGroups();

  const selectedGroupId = Form.useWatch('nodeGroupId', form);
  
  // Get schema fields for selected group
  const selectedGroup = useMemo(() => {
    return nodeGroups?.find(g => g.id === selectedGroupId);
  }, [nodeGroups, selectedGroupId]);

  const schemaFields = useMemo(() => {
    return (selectedGroup?.schemaFields || []) as SchemaField[];
  }, [selectedGroup]);

  const requiredTags = useMemo(() => {
    return (selectedGroup?.requiredTags || []) as string[];
  }, [selectedGroup]);

  useEffect(() => {
    if (open) {
      if (node) {
        form.setFieldsValue({
          name: node.name,
          nodeGroupId: node.nodeGroupId,
          remark: node.remark,
          groupMeta: (node as any).groupMeta || {},
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, node, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    // Auto-apply required tags from group
    const tags = [...(requiredTags || [])];
    const payload = { ...values, tags };
    
    if (node) {
      updateNode({ id: node.id, data: payload }, { onSuccess: onClose });
    } else {
      createNode(payload, { onSuccess: onClose });
    }
  };

  // Render dynamic schema field
  const renderSchemaField = (field: SchemaField) => {
    const fieldName = ['groupMeta', field.name];
    const rules = field.required ? [{ required: true, message: `${field.name} is required` }] : [];

    switch (field.type) {
      case 'select':
        return (
          <Form.Item key={field.name} name={fieldName} label={field.name} rules={rules}>
            <Select placeholder={`Select ${field.name}`} allowClear>
              {field.options?.map(opt => (
                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      case 'number':
        return (
          <Form.Item key={field.name} name={fieldName} label={field.name} rules={rules}>
            <InputNumber placeholder={`Enter ${field.name}`} className="w-full" />
          </Form.Item>
        );
      default:
        return (
          <Form.Item key={field.name} name={fieldName} label={field.name} rules={rules}>
            <Input placeholder={`Enter ${field.name}`} />
          </Form.Item>
        );
    }
  };

  return (
    <Modal
      title={node ? 'Edit Node' : 'Add Node'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={creating || updating}
      width={550}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please input node name' }]}>
          <Input placeholder="e.g., US-Node-01" />
        </Form.Item>
        
        <Form.Item name="nodeGroupId" label="Node Group" rules={[{ required: true, message: 'Please select a node group' }]}>
          <Select placeholder="Select node group">
            {nodeGroups?.map(g => (
              <Select.Option key={g.id} value={g.id}>
                {g.name} ({g.groupType})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Dynamic Schema Fields from Node Group */}
        {schemaFields.length > 0 && (
          <>
            <Divider orientation="left" plain>
              {selectedGroup?.groupType} Metadata
            </Divider>
            {schemaFields.map(renderSchemaField)}
          </>
        )}

        {/* Show hint if no group selected */}
        {!selectedGroupId && (
          <Alert 
            message="Select a node group to configure node metadata" 
            type="info" 
            showIcon 
            className="mb-4"
          />
        )}

        <Form.Item name="remark" label="Remark">
          <Input.TextArea rows={2} placeholder="Optional notes" />
        </Form.Item>

        {node && (
          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="online">Online</Select.Option>
              <Select.Option value="offline">Offline</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
