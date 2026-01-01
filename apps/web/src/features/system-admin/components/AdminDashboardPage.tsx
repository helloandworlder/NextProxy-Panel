import { Card, Row, Col, Statistic } from 'antd';
import { BankOutlined, TeamOutlined, CloudServerOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAdminDashboard } from '../hooks/useAdminHooks';

export function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Dashboard</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Statistic title="Total Tenants" value={data?.tenantCount || 0} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Statistic title="Total Users" value={data?.userCount || 0} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Statistic title="Total Nodes" value={data?.nodeCount || 0} prefix={<CloudServerOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Statistic title="Online Nodes" value={data?.onlineNodes || 0} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={isLoading}>
            <Statistic title="Total Clients" value={data?.clientCount || 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
