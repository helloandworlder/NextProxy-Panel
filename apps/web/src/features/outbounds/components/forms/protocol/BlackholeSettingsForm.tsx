import { Form, Select } from 'antd';

export function BlackholeSettingsForm() {
  return (
    <Form.Item 
      name={['settings', 'response', 'type']} 
      label="Response Type"
      tooltip="Type of response to send before dropping connection"
    >
      <Select placeholder="Select type">
        <Select.Option value="none">None (Silent drop)</Select.Option>
        <Select.Option value="http">HTTP 403 Forbidden</Select.Option>
      </Select>
    </Form.Item>
  );
}
