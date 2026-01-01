import { Form, Input, Select, Button, Space, Divider, InputNumber, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons';
import { useState } from 'react';

const FLOW_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'xtls-rprx-vision', value: 'xtls-rprx-vision' },
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Fallback {
  name?: string;
  alpn?: string;
  path?: string;
  dest: string;
  xver?: number;
}

interface Props {
  isEdit?: boolean;
  showFallbacks?: boolean;
}

export function VlessSettingsForm({ isEdit = false, showFallbacks = true }: Props) {
  const form = Form.useFormInstance();
  const [fallbacks, setFallbacks] = useState<Fallback[]>([]);

  const addFallback = () => {
    setFallbacks([...fallbacks, { dest: '', xver: 0 }]);
  };

  const removeFallback = (index: number) => {
    setFallbacks(fallbacks.filter((_, i) => i !== index));
  };

  return (
    <>
      <Divider orientation="left" plain>VLESS Settings</Divider>
      
      <Form.Item 
        name={['settings', 'decryption']} 
        label="Decryption"
        initialValue="none"
      >
        <Input placeholder="none" />
      </Form.Item>

      {/* First Client (for new inbound) */}
      {!isEdit && (
        <Collapse size="small" className="mb-4" defaultActiveKey={['client']}>
          <Collapse.Panel header="Client" key="client">
            <Form.Item 
              name={['settings', 'clients', 0, 'email']} 
              label="Email"
              rules={[{ required: true, message: 'Email is required' }]}
            >
              <Input 
                placeholder="user@example.com"
                addonAfter={
                  <SyncOutlined 
                    onClick={() => {
                      const email = Math.random().toString(36).substring(2, 10);
                      form.setFieldValue(['settings', 'clients', 0, 'email'], email);
                    }} 
                    style={{ cursor: 'pointer' }} 
                  />
                }
              />
            </Form.Item>

            <Form.Item 
              name={['settings', 'clients', 0, 'id']} 
              label="UUID"
              rules={[{ required: true, message: 'UUID is required' }]}
              initialValue={generateUUID()}
            >
              <Input 
                placeholder="UUID"
                addonAfter={
                  <SyncOutlined 
                    onClick={() => form.setFieldValue(['settings', 'clients', 0, 'id'], generateUUID())} 
                    style={{ cursor: 'pointer' }} 
                  />
                }
              />
            </Form.Item>

            <Form.Item 
              name={['settings', 'clients', 0, 'flow']} 
              label="Flow"
              tooltip="Only for XTLS (TCP + TLS/Reality)"
            >
              <Select options={FLOW_OPTIONS} placeholder="Select flow" allowClear />
            </Form.Item>

            <Form.Item 
              name={['settings', 'clients', 0, 'level']} 
              label="Level"
              initialValue={0}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      )}

      {/* Fallbacks */}
      {showFallbacks && (
        <Collapse size="small" className="mb-4">
          <Collapse.Panel 
            header={
              <Space>
                <span>Fallbacks</span>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />} 
                  onClick={(e) => { e.stopPropagation(); addFallback(); }}
                />
              </Space>
            } 
            key="fallbacks"
          >
            {fallbacks.map((_, index) => (
              <div key={index} className="border rounded p-3 mb-2 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Fallback {index + 1}</span>
                  <DeleteOutlined 
                    className="text-red-500 cursor-pointer" 
                    onClick={() => removeFallback(index)} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Form.Item 
                    name={['settings', 'fallbacks', index, 'name']} 
                    label="SNI" 
                    className="mb-2"
                  >
                    <Input placeholder="SNI" size="small" />
                  </Form.Item>
                  <Form.Item 
                    name={['settings', 'fallbacks', index, 'alpn']} 
                    label="ALPN" 
                    className="mb-2"
                  >
                    <Input placeholder="ALPN" size="small" />
                  </Form.Item>
                  <Form.Item 
                    name={['settings', 'fallbacks', index, 'path']} 
                    label="Path" 
                    className="mb-2"
                  >
                    <Input placeholder="/path" size="small" />
                  </Form.Item>
                  <Form.Item 
                    name={['settings', 'fallbacks', index, 'dest']} 
                    label="Dest" 
                    className="mb-2"
                    rules={[{ required: true }]}
                  >
                    <Input placeholder="127.0.0.1:80" size="small" />
                  </Form.Item>
                  <Form.Item 
                    name={['settings', 'fallbacks', index, 'xver']} 
                    label="xVer" 
                    className="mb-0"
                    initialValue={0}
                  >
                    <InputNumber min={0} max={2} size="small" className="w-full" />
                  </Form.Item>
                </div>
              </div>
            ))}
            {fallbacks.length === 0 && (
              <div className="text-gray-400 text-center py-4">No fallbacks configured</div>
            )}
          </Collapse.Panel>
        </Collapse>
      )}
    </>
  );
}
