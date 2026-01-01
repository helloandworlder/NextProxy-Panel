import { Row, Col, Card, Statistic, Spin, Tag, Progress, Space, Tooltip, Badge } from 'antd';
import {
  CloudServerOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useStatsOverview } from '../hooks/useStats';
import { useNodes } from '@/features/nodes/hooks/useNodes';
import type { Node } from '@/shared/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return '#ff4d4f';
  if (percent >= 70) return '#faad14';
  return '#52c41a';
}

// Node Status Card Component (3x-ui style)
function NodeStatusCard({ node }: { node: Node }) {
  const { runtimeStats } = node;
  const cpu = runtimeStats?.cpuUsage ?? 0;
  const memory = runtimeStats?.memoryUsage ?? 0;
  const disk = runtimeStats?.diskUsage ?? 0;
  const uptime = runtimeStats?.uptimeSeconds ?? 0;
  const onlineUsers = runtimeStats?.onlineUsers ?? 0;

  return (
    <Card size="small" hoverable className="h-full">
      <div className="flex justify-between items-center mb-3">
        <Space>
          <CloudServerOutlined />
          <span className="font-medium">{node.name}</span>
        </Space>
        <Tag color={node.status === 'online' ? 'green' : node.status === 'maintenance' ? 'orange' : 'red'}>
          {node.status}
        </Tag>
      </div>
      
      {/* System Metrics - 3x-ui style gauges */}
      <Row gutter={[4, 4]} className="text-center">
        <Col span={8}>
          <Tooltip title={`CPU: ${cpu.toFixed(1)}%`}>
            <Progress type="dashboard" percent={cpu} size={50} strokeColor={getProgressColor(cpu)} format={(p) => `${p?.toFixed(0)}%`} />
            <div className="text-xs text-gray-500">CPU</div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title={`Memory: ${memory.toFixed(1)}%`}>
            <Progress type="dashboard" percent={memory} size={50} strokeColor={getProgressColor(memory)} format={(p) => `${p?.toFixed(0)}%`} />
            <div className="text-xs text-gray-500">MEM</div>
          </Tooltip>
        </Col>
        <Col span={8}>
          <Tooltip title={`Disk: ${disk.toFixed(1)}%`}>
            <Progress type="dashboard" percent={disk} size={50} strokeColor={getProgressColor(disk)} format={(p) => `${p?.toFixed(0)}%`} />
            <div className="text-xs text-gray-500">DISK</div>
          </Tooltip>
        </Col>
      </Row>

      {/* Quick Stats */}
      <div className="mt-3 pt-2 border-t border-gray-100 text-sm">
        <Row>
          <Col span={12}>
            <SwapOutlined className="mr-1 text-blue-500" />
            <span className="text-gray-500">Users:</span>
            <span className="ml-1 font-medium">{onlineUsers}</span>
          </Col>
          <Col span={12}>
            <ClockCircleOutlined className="mr-1 text-green-500" />
            <span className="text-gray-500">Up:</span>
            <span className="ml-1 font-medium">{formatUptime(uptime)}</span>
          </Col>
        </Row>
        {node.countryName && (
          <div className="mt-1 text-xs text-gray-400">{node.countryName} {node.city && `- ${node.city}`}</div>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading, refetch } = useStatsOverview();
  const { data: nodes, isLoading: nodesLoading } = useNodes();

  if (statsLoading) {
    return <div className="flex justify-center py-12"><Spin size="large" /></div>;
  }

  const onlineNodes = nodes?.filter(n => n.status === 'online') ?? [];
  const offlineNodes = nodes?.filter(n => n.status === 'offline') ?? [];
  const nodeHealthPercent = stats?.totalNodes ? Math.round((stats.onlineNodes / stats.totalNodes) * 100) : 0;
  const clientActivePercent = stats?.totalClients ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Tooltip title="Refresh"><ReloadOutlined className="cursor-pointer text-lg" onClick={() => refetch()} /></Tooltip>
      </div>
      
      {/* Overview Stats - 3x-ui style */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Nodes" value={stats?.totalNodes ?? 0} prefix={<CloudServerOutlined />} suffix={<span className="text-sm text-gray-400">/ {stats?.onlineNodes ?? 0} online</span>} />
            <Progress percent={nodeHealthPercent} size="small" strokeColor={nodeHealthPercent > 80 ? '#52c41a' : nodeHealthPercent > 50 ? '#faad14' : '#ff4d4f'} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Clients" value={stats?.totalClients ?? 0} prefix={<UserOutlined />} suffix={<span className="text-sm text-gray-400">/ {stats?.activeClients ?? 0} active</span>} />
            <Progress percent={clientActivePercent} size="small" status="active" showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title={<Space><ArrowUpOutlined style={{ color: '#52c41a' }} />Traffic Today</Space>} value={formatBytes(stats?.totalTrafficToday ?? 0)} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title={<Space><ArrowDownOutlined style={{ color: '#1890ff' }} />Traffic Month</Space>} value={formatBytes(stats?.totalTrafficMonth ?? 0)} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* Node Status Grid - 3x-ui style */}
      <Card title={<Space><CloudServerOutlined />Node Status<Badge count={onlineNodes.length} style={{ backgroundColor: '#52c41a' }} /><Badge count={offlineNodes.length} style={{ backgroundColor: '#ff4d4f', marginLeft: 4 }} /></Space>} className="mt-4" loading={nodesLoading}>
        {nodes && nodes.length > 0 ? (
          <Row gutter={[16, 16]}>
            {nodes.map(node => (
              <Col xs={24} sm={12} lg={8} xl={6} key={node.id}>
                <NodeStatusCard node={node} />
              </Col>
            ))}
          </Row>
        ) : (
          <div className="text-center py-8 text-gray-400">No nodes configured. Add your first node to get started.</div>
        )}
      </Card>

      {/* System Health Summary */}
      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <Card title="System Health" size="small">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Node Availability</span>
                <span className={nodeHealthPercent > 80 ? 'text-green-500' : 'text-orange-500'}>{nodeHealthPercent}%</span>
              </div>
              <Progress percent={nodeHealthPercent} showInfo={false} strokeColor={nodeHealthPercent > 80 ? '#52c41a' : '#faad14'} />
              <div className="flex justify-between items-center">
                <span>Client Activation</span>
                <span className="text-blue-500">{clientActivePercent}%</span>
              </div>
              <Progress percent={clientActivePercent} showInfo={false} status="active" />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick Actions" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Online Nodes" value={stats?.onlineNodes ?? 0} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
              </Col>
              <Col span={12}>
                <Statistic title="Active Clients" value={stats?.activeClients ?? 0} prefix={<UserOutlined style={{ color: '#1890ff' }} />} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
