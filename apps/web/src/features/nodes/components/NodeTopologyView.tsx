import { useMemo } from 'react';
import { Card, Tag, Progress, Row, Col, Statistic, Badge } from 'antd';
import { 
  CloudServerOutlined, 
  GlobalOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  WarningOutlined,
  UserOutlined,
  SwapOutlined,
  HddOutlined,
} from '@ant-design/icons';
import type { Node } from '@/shared/types';

interface Props {
  nodes: Node[];
  onNodeClick?: (node: Node) => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'online': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'maintenance': return <WarningOutlined style={{ color: '#faad14' }} />;
    default: return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  }
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return '#ff4d4f';
  if (percent >= 70) return '#faad14';
  return '#52c41a';
}

export function NodeTopologyView({ nodes, onNodeClick }: Props) {
  // Group nodes by country
  const nodesByCountry = useMemo(() => {
    const groups: Record<string, Node[]> = {};
    nodes.forEach(node => {
      const country = node.countryName || 'Unknown';
      if (!groups[country]) groups[country] = [];
      groups[country].push(node);
    });
    return groups;
  }, [nodes]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const online = nodes.filter(n => n.status === 'online').length;
    const totalUsers = nodes.reduce((sum, n) => sum + (n.runtimeStats?.onlineUsers || 0), 0);
    const avgCpu = nodes.length > 0 
      ? nodes.reduce((sum, n) => sum + (n.runtimeStats?.cpuUsage || 0), 0) / nodes.length 
      : 0;
    const avgMem = nodes.length > 0 
      ? nodes.reduce((sum, n) => sum + (n.runtimeStats?.memoryUsage || 0), 0) / nodes.length 
      : 0;
    return { online, total: nodes.length, totalUsers, avgCpu, avgMem };
  }, [nodes]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Nodes Online" 
              value={stats.online} 
              suffix={`/ ${stats.total}`}
              valueStyle={{ color: stats.online === stats.total ? '#52c41a' : '#faad14' }}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Total Online Users" 
              value={stats.totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Avg CPU Usage" 
              value={stats.avgCpu.toFixed(1)}
              suffix="%"
              valueStyle={{ color: getProgressColor(stats.avgCpu) }}
              prefix={<HddOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Avg Memory Usage" 
              value={stats.avgMem.toFixed(1)}
              suffix="%"
              valueStyle={{ color: getProgressColor(stats.avgMem) }}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Nodes by Region */}
      {Object.entries(nodesByCountry).map(([country, countryNodes]) => (
        <Card 
          key={country} 
          title={<><GlobalOutlined className="mr-2" />{country} ({countryNodes.length} nodes)</>}
          size="small"
        >
          <Row gutter={[16, 16]}>
            {countryNodes.map(node => (
              <Col key={node.id} xs={24} sm={12} md={8} lg={6}>
                <NodeCard node={node} onClick={() => onNodeClick?.(node)} />
              </Col>
            ))}
          </Row>
        </Card>
      ))}
    </div>
  );
}

function NodeCard({ node, onClick }: { node: Node; onClick?: () => void }) {
  const cpu = node.runtimeStats?.cpuUsage ?? 0;
  const memory = node.runtimeStats?.memoryUsage ?? 0;
  const onlineUsers = node.runtimeStats?.onlineUsers ?? 0;

  return (
    <Card 
      size="small" 
      hoverable 
      onClick={onClick}
      className="h-full"
      styles={{ body: { padding: '12px' } }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge status={node.status === 'online' ? 'success' : node.status === 'maintenance' ? 'warning' : 'error'} />
          <span className="font-medium truncate" style={{ maxWidth: 120 }}>{node.name}</span>
        </div>
        {getStatusIcon(node.status)}
      </div>
      
      <div className="text-xs text-gray-500 mb-2">
        {node.publicIp || 'No IP'} {node.city && `• ${node.city}`}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>CPU</span>
          <span>{cpu.toFixed(0)}%</span>
        </div>
        <Progress percent={cpu} size="small" strokeColor={getProgressColor(cpu)} showInfo={false} />
        
        <div className="flex items-center justify-between text-xs">
          <span>MEM</span>
          <span>{memory.toFixed(0)}%</span>
        </div>
        <Progress percent={memory} size="small" strokeColor={getProgressColor(memory)} showInfo={false} />
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-xs">
        <span><UserOutlined className="mr-1" />{onlineUsers} users</span>
        <Tag color={node.status === 'online' ? 'green' : 'red'} className="m-0">{node.status}</Tag>
      </div>
    </Card>
  );
}
