import { useState } from 'react';
import { Table, Card, Select, DatePicker, Button, Tag, Space, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuditLogs, useAuditLogActions, useAuditLogResourceTypes } from '../hooks/useAuditLogs';
import type { AuditLog, AuditLogQuery } from '../api/auditLogsApi';

const { RangePicker } = DatePicker;

const actionColors: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'purple',
  logout: 'orange',
};

export function AuditLogsPage() {
  const [query, setQuery] = useState<AuditLogQuery>({ page: 1, limit: 20 });
  const { data, isLoading, refetch } = useAuditLogs(query);
  const { data: actions = [] } = useAuditLogActions();
  const { data: resourceTypes = [] } = useAuditLogResourceTypes();

  const handleSearch = () => {
    setQuery((q) => ({ ...q, page: 1 }));
    refetch();
  };

  const handleReset = () => {
    setQuery({ page: 1, limit: 20 });
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: 'User',
      dataIndex: ['user', 'username'],
      key: 'user',
      width: 120,
      render: (_, r) => r.user?.username || r.apiKeyId?.slice(0, 8) || '-',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (v) => <Tag color={actionColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Resource',
      key: 'resource',
      width: 200,
      render: (_, r) => (
        <span>
          {r.resourceType && <Tag>{r.resourceType}</Tag>}
          {r.resourceId && (
            <Tooltip title={r.resourceId}>
              <span className="text-gray-500 text-xs">{r.resourceId.slice(0, 8)}...</span>
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
    },
    {
      title: 'Changes',
      dataIndex: 'changes',
      key: 'changes',
      ellipsis: true,
      render: (v) => (v ? <Tooltip title={JSON.stringify(v, null, 2)}><span className="text-xs">View</span></Tooltip> : '-'),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Audit Logs</h1>
      <Card className="mb-4">
        <Space wrap>
          <Select
            allowClear
            placeholder="Action"
            style={{ width: 120 }}
            options={actions.map((a) => ({ value: a, label: a }))}
            value={query.action}
            onChange={(v) => setQuery((q) => ({ ...q, action: v }))}
          />
          <Select
            allowClear
            placeholder="Resource Type"
            style={{ width: 150 }}
            options={resourceTypes.map((t) => ({ value: t, label: t }))}
            value={query.resourceType}
            onChange={(v) => setQuery((q) => ({ ...q, resourceType: v }))}
          />
          <RangePicker
            onChange={(dates) => {
              setQuery((q) => ({
                ...q,
                startDate: dates?.[0]?.toISOString(),
                endDate: dates?.[1]?.toISOString(),
              }));
            }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
        </Space>
      </Card>
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: query.page,
          pageSize: query.limit,
          total: data?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} records`,
          onChange: (page, pageSize) => setQuery((q) => ({ ...q, page, limit: pageSize })),
        }}
      />
    </div>
  );
}
