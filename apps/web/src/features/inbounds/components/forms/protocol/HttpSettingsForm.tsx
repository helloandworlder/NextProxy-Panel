import { Form, Input, Switch, InputNumber } from 'antd';

export function HttpSettingsForm() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'accounts', 0, 'user']} 
          label="Username (Optional)"
        >
          <Input placeholder="Leave empty for no auth" />
        </Form.Item>
        <Form.Item 
          name={['settings', 'accounts', 0, 'pass']} 
          label="Password"
        >
          <Input.Password placeholder="Password" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item 
          name={['settings', 'allowTransparent']} 
          label="Allow Transparent"
          valuePropName="checked"
          tooltip="Allow transparent proxy mode"
        >
          <Switch />
        </Form.Item>
        <Form.Item 
          name={['settings', 'userLevel']} 
          label="User Level"
          initialValue={0}
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>
      </div>
    </>
  );
}
