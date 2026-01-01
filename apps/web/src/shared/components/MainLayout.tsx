import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Typography } from 'antd';
import {
  DashboardOutlined, CloudServerOutlined, TeamOutlined, SettingOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined,
  GlobalOutlined, ApartmentOutlined, SwapOutlined, NodeIndexOutlined,
  PartitionOutlined, SafetyCertificateOutlined, KeyOutlined, ApiOutlined,
  FileSearchOutlined, UserSwitchOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLogout, useSwitchTenant } from '@/features/auth/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const currentTenant = useAuthStore((s) => s.currentTenant);
  const tenants = useAuthStore((s) => s.tenants);
  const logout = useLogout();
  const { mutate: switchTenant } = useSwitchTenant();
  const { t, currentLanguage, setLanguage, supportedLanguages } = useI18n();

  const menuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/nodes', icon: <CloudServerOutlined />, label: t('menu.nodes') },
    { key: '/node-groups', icon: <ApartmentOutlined />, label: t('menu.nodeGroups') },
    { key: '/inbounds', icon: <SwapOutlined />, label: t('menu.inbounds') },
    { key: '/outbounds', icon: <SwapOutlined style={{ transform: 'scaleX(-1)' }} />, label: t('menu.outbounds') },
    { key: '/routing', icon: <NodeIndexOutlined />, label: t('menu.routing') },
    { key: '/balancers', icon: <PartitionOutlined />, label: t('menu.balancers') },
    { key: '/dns-config', icon: <GlobalOutlined />, label: t('menu.dnsConfig') },
    { key: '/policy-config', icon: <SafetyCertificateOutlined />, label: t('menu.policyConfig') },
    { key: '/clients', icon: <TeamOutlined />, label: t('menu.clients') },
    { key: '/tenant-users', icon: <UserSwitchOutlined />, label: t('menu.tenantUsers') },
    { key: '/api-keys', icon: <KeyOutlined />, label: t('menu.apiKeys') },
    { key: '/gosea-plugin', icon: <ApiOutlined />, label: 'GoSea Plugin' },
    { key: '/audit-logs', icon: <FileSearchOutlined />, label: t('menu.auditLogs') },
    { key: '/settings', icon: <SettingOutlined />, label: t('menu.settings') },
  ];

  const tenantMenuItems: MenuProps['items'] = tenants.map((tenant) => ({
    key: tenant.id,
    label: tenant.name,
    onClick: () => tenant.id !== currentTenant?.id && switchTenant({ tenantId: tenant.id }),
  }));

  const languageMenuItems: MenuProps['items'] = supportedLanguages.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    onClick: () => setLanguage(lang.code),
  }));

  const userMenuItems: MenuProps['items'] = [
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
          background: 'linear-gradient(180deg, #1e3a5f 0%, #0d1b2a 100%)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
        }} onClick={() => navigate('/dashboard')}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: 8,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ThunderboltOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          {!collapsed && (
            <span style={{ marginLeft: 12, fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Panel
            </span>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            borderRight: 0,
            marginTop: 8,
          }}
        />

        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: collapsed ? '16px 8px' : '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <Avatar style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', display: 'block', fontWeight: 500 }} ellipsis>
                  {user?.username}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} ellipsis>
                  {currentTenant?.name}
                </Text>
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
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            {tenants.length > 1 && (
              <Dropdown menu={{ items: tenantMenuItems }} placement="bottomLeft">
                <Button>{currentTenant?.name}</Button>
              </Dropdown>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={{ items: languageMenuItems }} placement="bottomRight">
              <Button type="text" icon={<GlobalOutlined />}>
                {currentLanguage === 'zh-CN' ? '中文' : 'EN'}
              </Button>
            </Dropdown>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
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
