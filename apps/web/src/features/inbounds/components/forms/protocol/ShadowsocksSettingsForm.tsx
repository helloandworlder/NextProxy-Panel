import { Form, Input, Select, Collapse, Divider } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

const SS_METHODS = [
  { label: '2022-blake3-aes-128-gcm', value: '2022-blake3-aes-128-gcm' },
  { label: '2022-blake3-aes-256-gcm', value: '2022-blake3-aes-256-gcm' },
  { label: '2022-blake3-chacha20-poly1305', value: '2022-blake3-chacha20-poly1305' },
  { label: 'aes-256-gcm', value: 'aes-256-gcm' },
  { label: 'aes-128-gcm', value: 'aes-128-gcm' },
  { label: 'chacha20-poly1305', value: 'chacha20-poly1305' },
  { label: 'chacha20-ietf-poly1305', value: 'chacha20-ietf-poly1305' },
  { label: 'xchacha20-poly1305', value: 'xchacha20-poly1305' },
  { label: 'xchacha20-ietf-poly1305', value: 'xchacha20-ietf-poly1305' },
  { label: 'none', value: 'none' },
  { label: 'plain', value: 'plain' },
];

function generateSSPassword(method: string): string {
  // SS 2022 methods require base64 encoded keys
  if (method.startsWith('2022-blake3')) {
    const keyLength = method.includes('aes-128') ? 16 : 32;
    const bytes = new Uint8Array(keyLength);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes));
  }
  // Legacy methods use plain password
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface Props {
  isEdit?: boolean;
}

export function ShadowsocksSettingsForm({ isEdit = false }: Props) {
  const form = Form.useFormInstance();
  const method = Form.useWatch(['settings', 'method'], form) || 'aes-256-gcm';

  const regeneratePassword = () => {
    const currentMethod = form.getFieldValue(['settings', 'method']) || 'aes-256-gcm';
    form.setFieldValue(['settings', 'password'], generateSSPassword(currentMethod));
  };

  return (
    <>
      <Divider orientation="left" plain>Shadowsocks Settings</Divider>

      <Form.Item 
        name={['settings', 'method']} 
        label="Encryption Method"
        initialValue="aes-256-gcm"
        rules={[{ required: true }]}
      >
        <Select 
          options={SS_METHODS} 
          onChange={() => regeneratePassword()}
        />
      </Form.Item>

      <Form.Item 
        name={['settings', 'password']} 
        label="Password"
        rules={[{ required: true, message: 'Password is required' }]}
        initialValue={generateSSPassword('aes-256-gcm')}
        tooltip={method.startsWith('2022-blake3') ? 'SS 2022 requires base64 encoded key' : undefined}
      >
        <Input.Password 
          placeholder="Password"
          addonAfter={
            <SyncOutlined 
              onClick={regeneratePassword} 
              style={{ cursor: 'pointer' }} 
            />
          }
        />
      </Form.Item>

      <Form.Item 
        name={['settings', 'network']} 
        label="Network"
        initialValue="tcp,udp"
      >
        <Select>
          <Select.Option value="tcp,udp">TCP + UDP</Select.Option>
          <Select.Option value="tcp">TCP Only</Select.Option>
          <Select.Option value="udp">UDP Only</Select.Option>
        </Select>
      </Form.Item>

      {/* Multi-user mode */}
      {!isEdit && (
        <Collapse size="small" className="mb-4">
          <Collapse.Panel header="Multi-user (Optional)" key="clients">
            <Form.Item 
              name={['settings', 'clients', 0, 'email']} 
              label="Email"
            >
              <Input 
                placeholder="user@example.com (optional)"
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
              label="User Password"
            >
              <Input.Password 
                placeholder="User-specific password (optional)"
                addonAfter={
                  <SyncOutlined 
                    onClick={() => {
                      const currentMethod = form.getFieldValue(['settings', 'method']) || 'aes-256-gcm';
                      form.setFieldValue(['settings', 'clients', 0, 'password'], generateSSPassword(currentMethod));
                    }} 
                    style={{ cursor: 'pointer' }} 
                  />
                }
              />
            </Form.Item>
          </Collapse.Panel>
        </Collapse>
      )}
    </>
  );
}
