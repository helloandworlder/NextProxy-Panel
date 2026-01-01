import { Form, Input, Collapse, Divider, Button, Space, InputNumber } from 'antd';
import { SyncOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';

function generatePassword(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

export function TrojanSettingsForm({ isEdit = false, showFallbacks = true }: Props) {
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
      <Divider orientation="left" plain>Trojan Settings</Divider>

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
              name={['settings', 'clients', 0, 'password']} 
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
              initialValue={generatePassword()}
            >
              <Input.Password 
                placeholder="Password"
                addonAfter={
                  <SyncOutlined 
                    onClick={() => form.setFieldValue(['settings', 'clients', 0, 'password'], generatePassword())} 
                    style={{ cursor: 'pointer' }} 
                  />
                }
              />
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
