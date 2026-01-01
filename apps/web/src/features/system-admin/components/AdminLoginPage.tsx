import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Dropdown, Space } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, SafetyCertificateOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAdminLogin } from '../hooks/useAdminHooks';
import { useI18n } from '@/hooks/useI18n';

const { Title, Text } = Typography;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useAdminLogin();
  const { t, currentLanguage, setLanguage, supportedLanguages } = useI18n();
  const [form] = Form.useForm();

  const handleSubmit = (values: { username: string; password: string }) => {
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
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <SafetyCertificateOutlined style={{ fontSize: '28px', color: '#fff' }} />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>
              {t('auth.adminWelcome')}
            </Text>
          </div>
          <Title level={1} style={{ color: '#fff', fontSize: '36px', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3 }}>
            System Administration Console
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
            Full control over tenants, users, and system configuration.
          </Text>
        </div>

        <Space direction="vertical" size={16} style={{ position: 'relative', zIndex: 1 }}>
          {['Manage All Tenants', 'User & Permission Control', 'System Configuration'].map((feature, i) => (
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
          <Button type="link" onClick={() => navigate('/login')} style={{ color: '#666', padding: 0 }}>
            ← Tenant Login
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
                <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', padding: '8px', borderRadius: '8px' }}>
                  <ThunderboltOutlined style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>{t('auth.brandTitle')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <SafetyCertificateOutlined style={{ color: '#f97316' }} />
                <Text style={{ color: '#f97316', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t('auth.adminWelcome')}
                </Text>
              </div>
            </div>

            <Title level={2} style={{ marginBottom: '8px' }}>{t('auth.adminWelcome')}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '32px' }}>
              {t('auth.adminWelcomeSubtitle')}
            </Text>

            <Form form={form} onFinish={handleSubmit} layout="vertical" size="large">
              <Form.Item name="username" rules={[{ required: true, message: t('auth.username') }]}>
                <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder={t('auth.username')} />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder={t('auth.password')} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={isPending} block style={{
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none',
                }}>
                  {t('auth.login')}
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Protected area. Unauthorized access is prohibited.
              </Text>
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
