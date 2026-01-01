import { Navigate, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Typography, Space, Dropdown } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useLogin } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '@/hooks/useI18n';
import type { LoginRequest } from '@/shared/types';

const { Title, Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { mutate: login, isPending } = useLogin();
  const { t, currentLanguage, setLanguage, supportedLanguages } = useI18n();
  const [form] = Form.useForm();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (values: LoginRequest) => {
    login(values);
  };

  const languageItems = supportedLanguages.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    onClick: () => setLanguage(lang.code),
  }));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Left Side - Brand */}
      <div style={{
        width: '45%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }} className="hidden-mobile">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '64px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
              <ThunderboltOutlined style={{ fontSize: '24px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{t('auth.brandTitle')}</span>
          </div>
          
          <Title level={1} style={{ color: '#fff', fontSize: '36px', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3 }}>
            {t('auth.brandSubtitle')}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
            Manage your proxy nodes, clients, and traffic with ease.
          </Text>
        </div>

        <Space direction="vertical" size={16} style={{ position: 'relative', zIndex: 1 }}>
          {[t('auth.feature1'), t('auth.feature2'), t('auth.feature3')].map((feature, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircleOutlined style={{ color: '#fff', fontSize: '18px' }} />
              <Text style={{ color: '#fff', fontWeight: 500 }}>{feature}</Text>
            </div>
          ))}
        </Space>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
      </div>

      {/* Right Side - Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <Button type="link" onClick={() => navigate('/admin/login')} style={{ color: '#666', padding: 0 }}>
            {t('auth.adminWelcome')} →
          </Button>
          <Dropdown menu={{ items: languageItems }} placement="bottomRight">
            <Button type="text" icon={<GlobalOutlined />}>
              {currentLanguage === 'zh-CN' ? '中文' : 'English'}
            </Button>
          </Dropdown>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {/* Mobile Logo */}
            <div className="mobile-only" style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '8px', borderRadius: '8px' }}>
                  <ThunderboltOutlined style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>{t('auth.brandTitle')}</span>
              </div>
            </div>

            <Title level={2} style={{ marginBottom: '8px' }}>{t('auth.welcome')}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '32px' }}>
              {t('auth.welcomeSubtitle')}
            </Text>

            <Form form={form} onFinish={handleSubmit} layout="vertical" size="large">
              <Form.Item name="username" rules={[{ required: true, message: t('auth.username') }]}>
                <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder={t('auth.username')} />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder={t('auth.password')} />
              </Form.Item>

              <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox>{t('auth.rememberMe')}</Checkbox>
                  <Button type="link" style={{ padding: 0 }}>{t('auth.forgotPassword')}</Button>
                </div>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={isPending} block style={{
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}>
                  {t('auth.login')}
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">{t('auth.noAccount')} </Text>
              <Button type="link" style={{ padding: 0 }}>{t('auth.contactAdmin')}</Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
