import { useState, useEffect } from 'react';
import { Modal, Table, DatePicker, Space, Statistic, Row, Col, Card } from 'antd';
import dayjs from 'dayjs';
import { clientsApi } from '../api/clientsApi';
import type { Client, TrafficRecord } from '@/shared/types';

interface Props {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function TrafficHistoryModal({ open, client, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<TrafficRecord[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  useEffect(() => {
    if (open && client) {
      fetchTraffic();
    }
  }, [open, client, dateRange]);

  const fetchTraffic = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await clientsApi.getTraffic(
        client.id,
        dateRange[0].startOf('day').valueOf(),
        dateRange[1].endOf('day').valueOf()
      );
      setRecords(data);
    } catch (e) {
      console.error('Failed to fetch traffic', e);
    } finally {
      setLoading(false);
    }
  };

  const totalUpload = records.reduce((sum, r) => sum + Number(r.upload || 0), 0);
  const totalDownload = records.reduce((sum, r) => sum + Number(r.download || 0), 0);

  const columns = [
    {
      title: 'Time',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Upload',
      dataIndex: 'upload',
      key: 'upload',
      render: (v: number) => formatBytes(Number(v)),
    },
    {
      title: 'Download',
      dataIndex: 'download',
      key: 'download',
      render: (v: number) => formatBytes(Number(v)),
    },
    {
      title: 'Total',
      key: 'total',
      render: (_: unknown, r: TrafficRecord) => formatBytes(Number(r.upload || 0) + Number(r.download || 0)),
    },
  ];

  return (
    <Modal
      title={`Traffic History - ${client?.email || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Space direction="vertical" className="w-full" size="middle">
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
          allowClear={false}
        />
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="Total Upload" value={formatBytes(totalUpload)} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="Total Download" value={formatBytes(totalDownload)} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="Total Traffic" value={formatBytes(totalUpload + totalDownload)} />
            </Card>
          </Col>
        </Row>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Space>
    </Modal>
  );
}
