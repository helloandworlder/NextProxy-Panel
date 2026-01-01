import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Typography } from 'antd';
import {
  DashboardOutlined, TeamOutlined, SettingOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, GlobalOutlined, BankOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { useAdminLogout } from '../hooks/useAdminHooks';
import { useI18n } from '@/hooks/useI18n';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAdminAuthStore((s) => s.user);
  const logout = useAdminLogout();
  const { t, currentLanguage, setLanguage, supportedLanguages } = useI18n();

  const menuItems: MenuProps['items'] = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/tenants', icon: <BankOutlined />, label: 'Tenants' },
    { key: '/admin/users', icon: <TeamOutlined />, label: 'Users' },
    { key: '/admin/admins', icon: <SafetyCertificateOutlined />, label: 'System Admins' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const languageMenuItems: MenuProps['items'] = supportedLanguages.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    onClick: () => setLanguage(lang.code),
  }));

  const userMenuItems: MenuProps['items'] = [
    { key: 'tenant-portal', label: 'Tenant Portal', onClick: () => navigate('/login') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: t('menu.logout'), onClick: logout, danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={80}
        width={240}
        style={{
          background: '#fff',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
        }} onClick={() => navigate('/admin/dashboard')}>
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            padding: 8,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ThunderboltOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', display: 'block' }}>Panel</span>
              <span style={{ fontSize: 10, color: '#f97316', fontWeight: 600, letterSpacing: 1 }}>ADMIN</span>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: collapsed ? '16px 8px' : '16px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Avatar style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#1f2937', display: 'block', fontWeight: 500 }} ellipsis>{user?.username}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>System Admin</Text>
              </div>
            )}
          </div>
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, color: '#6b7280' }}
            />
            <Text style={{ color: '#1f2937', fontWeight: 600, fontSize: 16 }}>System Administration</Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dropdown menu={{ items: languageMenuItems }} placement="bottomRight">
              <Button type="text" icon={<GlobalOutlined />} style={{ color: '#6b7280' }}>
                {currentLanguage === 'zh-CN' ? '中文' : 'EN'}
              </Button>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </Avatar>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
