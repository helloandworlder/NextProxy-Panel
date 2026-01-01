import { Form, Input, Select, InputNumber, Collapse } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { Divider } from 'antd';

const SECURITY_OPTIONS = [
  { label: 'auto', value: 'auto' },
  { label: 'aes-128-gcm', value: 'aes-128-gcm' },
  { label: 'chacha20-poly1305', value: 'chacha20-poly1305' },
  { label: 'none', value: 'none' },
  { label: 'zero', value: 'zero' },
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Props {
  isEdit?: boolean;
}

export function VmessSettingsForm({ isEdit = false }: Props) {
  const form = Form.useFormInstance();

  return (
    <>
      <Divider orientation="left" plain>VMess Settings</Divider>

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
              name={['settings', 'clients', 0, 'alterId']} 
              label="Alter ID"
              initialValue={0}
              tooltip="Recommended: 0 for VMess AEAD"
            >
              <InputNumber min={0} max={65535} className="w-full" />
            </Form.Item>

            <Form.Item 
              name={['settings', 'clients', 0, 'security']} 
              label="Security"
              initialValue="auto"
            >
              <Select options={SECURITY_OPTIONS} />
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
    </>
  );
}
