import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Spin, Divider, Tag, List, Typography } from 'antd';
import { CheckCircleOutlined, GithubOutlined } from '@ant-design/icons';
import { systemAdminApi } from '../api/systemAdminApi';

const { Text } = Typography;

interface ReleaseInfo {
  tag: string;
  name: string;
  assets: Array<{ name: string; url: string }>;
}

export function AdminSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState<'agent' | 'xray' | null>(null);
  const [agentRelease, setAgentRelease] = useState<ReleaseInfo | null>(null);
  const [xrayRelease, setXrayRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await systemAdminApi.getSettings();
      form.setFieldsValue({
        agentRepo: settings['agent.github.repo'],
        agentRelease: settings['agent.github.release'],
        agentBinaryName: settings['agent.binary.name'],
        xrayRepo: settings['xray.github.repo'],
        xrayRelease: settings['xray.github.release'],
      });
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue();
      await Promise.all([
        systemAdminApi.updateSetting('agent.github.repo', values.agentRepo),
        systemAdminApi.updateSetting('agent.github.release', values.agentRelease),
        systemAdminApi.updateSetting('agent.binary.name', values.agentBinaryName),
        systemAdminApi.updateSetting('xray.github.repo', values.xrayRepo),
        systemAdminApi.updateSetting('xray.github.release', values.xrayRelease),
      ]);
      message.success('Settings saved successfully');
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const validateAgentRelease = async () => {
    const values = form.getFieldsValue();
    setValidating('agent');
    try {
      const result = await systemAdminApi.validateRelease(values.agentRepo, values.agentRelease);
      if (result.valid && result.release) {
        setAgentRelease(result.release);
        message.success(`Found release: ${result.release.tag}`);
      } else {
        setAgentRelease(null);
        message.error(result.error || 'Release not found');
      }
    } catch {
      setAgentRelease(null);
      message.error('Failed to validate release');
    } finally {
      setValidating(null);
    }
  };

  const validateXrayRelease = async () => {
    const values = form.getFieldsValue();
    setValidating('xray');
    try {
      const result = await systemAdminApi.validateRelease(values.xrayRepo, values.xrayRelease);
      if (result.valid && result.release) {
        setXrayRelease(result.release);
        message.success(`Found release: ${result.release.tag}`);
      } else {
        setXrayRelease(null);
        message.error(result.error || 'Release not found');
      }
    } catch {
      setXrayRelease(null);
      message.error('Failed to validate release');
    } finally {
      setValidating(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Spin size="large" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card title={<><GithubOutlined /> Agent Binary Settings</>} className="mb-4">
          <Form.Item label="GitHub Repository" name="agentRepo" rules={[{ required: true }]}
            extra="Format: owner/repo (e.g., nextproxy/agent)">
            <Input placeholder="nextproxy/agent" />
          </Form.Item>
          
          <Form.Item label="Release Version" name="agentRelease" rules={[{ required: true }]}
            extra="Use 'latest' for latest release or specify a tag (e.g., v1.0.0)">
            <Input placeholder="latest" />
          </Form.Item>
          
          <Form.Item label="Binary Name Template" name="agentBinaryName" rules={[{ required: true }]}
            extra="Use {os} and {arch} as placeholders (e.g., agent-{os}-{arch})">
            <Input placeholder="agent-{os}-{arch}" />
          </Form.Item>

          <Button onClick={validateAgentRelease} loading={validating === 'agent'}>
            Validate Release
          </Button>

          {agentRelease && (
            <div className="mt-4">
              <Tag color="green" icon={<CheckCircleOutlined />}>{agentRelease.tag}</Tag>
              <Text type="secondary" className="ml-2">{agentRelease.name}</Text>
              <List size="small" className="mt-2" dataSource={agentRelease.assets.slice(0, 5)}
                renderItem={(asset) => (
                  <List.Item><Text code>{asset.name}</Text></List.Item>
                )}
              />
            </div>
          )}
        </Card>

        <Card title={<><GithubOutlined /> Xray-core Settings</>} className="mb-4">
          <Form.Item label="GitHub Repository" name="xrayRepo" rules={[{ required: true }]}
            extra="Default: XTLS/Xray-core (or your custom fork)">
            <Input placeholder="XTLS/Xray-core" />
          </Form.Item>
          
          <Form.Item label="Release Version" name="xrayRelease" rules={[{ required: true }]}
            extra="Use 'latest' for latest release or specify a tag">
            <Input placeholder="latest" />
          </Form.Item>

          <Button onClick={validateXrayRelease} loading={validating === 'xray'}>
            Validate Release
          </Button>

          {xrayRelease && (
            <div className="mt-4">
              <Tag color="green" icon={<CheckCircleOutlined />}>{xrayRelease.tag}</Tag>
              <Text type="secondary" className="ml-2">{xrayRelease.name}</Text>
            </div>
          )}
        </Card>

        <Divider />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} size="large">
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
