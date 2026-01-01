import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface NodeSystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  connections: number;
  timestamp: number;
}

@Injectable()
export class StatsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getOverview(tenantId: string) {
    const [totalNodes, onlineNodes, totalClients, activeClients, trafficStats] = await Promise.all([
      this.prisma.node.count({ where: { tenantId } }),
      this.prisma.node.count({ where: { tenantId, status: 'online' } }),
      this.prisma.client.count({ where: { tenantId } }),
      this.prisma.client.count({ where: { tenantId, enable: true } }),
      this.prisma.client.aggregate({
        where: { tenantId },
        _sum: { usedBytes: true },
      }),
    ]);

    // Get traffic by node
    const nodes = await this.prisma.node.findMany({
      where: { tenantId },
      select: { id: true, name: true, status: true },
    });
    
    const byNode = await Promise.all(
      nodes.map(async (node) => {
        const stats = await this.prisma.nodeStats.aggregate({
          where: { nodeId: node.id },
          _sum: { up: true, down: true },
        });
        return {
          nodeId: node.id,
          name: node.name,
          status: node.status,
          up: Number(stats._sum.up || 0),
          down: Number(stats._sum.down || 0),
        };
      }),
    );

    // Get traffic by inbound
    const inbounds = await this.prisma.inbound.findMany({
      where: { tenantId },
      select: { id: true, tag: true, protocol: true },
    });
    
    const byInbound = await Promise.all(
      inbounds.map(async (inbound) => {
        const stats = await this.prisma.inboundStats.aggregate({
          where: { inboundId: inbound.id },
          _sum: { up: true, down: true },
        });
        return {
          inboundId: inbound.id,
          tag: inbound.tag,
          protocol: inbound.protocol,
          up: Number(stats._sum.up || 0),
          down: Number(stats._sum.down || 0),
        };
      }),
    );

    // Top clients
    const topClients = await this.prisma.client.findMany({
      where: { tenantId },
      orderBy: { usedBytes: 'desc' },
      take: 10,
      select: { email: true, usedBytes: true },
    });

    return {
      totalNodes,
      onlineNodes,
      totalClients,
      activeClients,
      totalTraffic: Number(trafficStats._sum.usedBytes || 0),
      byNode,
      byInbound,
      topClients: topClients.map(c => ({ email: c.email, traffic: Number(c.usedBytes) })),
    };
  }

  async getNodeStats(tenantId: string, nodeId: string) {
    const [node, clientStats] = await Promise.all([
      this.prisma.node.findFirst({ where: { id: nodeId, tenantId } }),
      // Get stats from ClientStats table (3x-ui style)
      this.prisma.clientStats.findMany({
        where: { nodeId },
        include: { client: { select: { email: true } } },
        orderBy: { down: 'desc' },
        take: 10,
      }),
    ]);

    return {
      onlineUsers: (node?.runtimeStats as any)?.onlineUsers || 0,
      trafficToday: 0,
      trafficMonth: clientStats.reduce((sum, s) => sum + Number(s.up) + Number(s.down), 0),
      topClients: clientStats.map((s) => ({
        email: s.client.email,
        traffic: Number(s.up) + Number(s.down),
      })),
    };
  }

  /**
   * Get real-time bandwidth statistics for all nodes in a tenant
   * Data comes from Redis (updated by Agent every few seconds)
   */
  async getRealtimeBandwidth(tenantId: string) {
    const nodes = await this.prisma.node.findMany({
      where: { tenantId },
      select: { id: true, name: true, status: true },
    });

    const bandwidthData = await Promise.all(
      nodes.map(async (node) => {
        const traffic = (await this.redis.getNodeTraffic(node.id)) as {
          uploadRate?: number;
          downloadRate?: number;
          totalUpload?: number;
          totalDownload?: number;
          timestamp?: number;
        } | null;

        return {
          nodeId: node.id,
          nodeName: node.name,
          status: node.status,
          uploadRate: traffic?.uploadRate || 0,
          downloadRate: traffic?.downloadRate || 0,
          totalUpload: traffic?.totalUpload || 0,
          totalDownload: traffic?.totalDownload || 0,
          lastUpdate: traffic?.timestamp ? new Date(traffic.timestamp) : null,
        };
      }),
    );

    const totalUploadRate = bandwidthData.reduce((sum, n) => sum + n.uploadRate, 0);
    const totalDownloadRate = bandwidthData.reduce((sum, n) => sum + n.downloadRate, 0);

    return {
      totalUploadRate,
      totalDownloadRate,
      nodes: bandwidthData,
    };
  }

  /**
   * Get real-time bandwidth for a specific node
   */
  async getNodeRealtimeBandwidth(tenantId: string, nodeId: string) {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, tenantId },
      select: { id: true, name: true, status: true },
    });

    if (!node) return null;

    const traffic = (await this.redis.getNodeTraffic(nodeId)) as {
      uploadRate?: number;
      downloadRate?: number;
      totalUpload?: number;
      totalDownload?: number;
      timestamp?: number;
      userBandwidth?: Array<{ email: string; uploadRate: number; downloadRate: number }>;
    } | null;

    return {
      nodeId: node.id,
      nodeName: node.name,
      status: node.status,
      uploadRate: traffic?.uploadRate || 0,
      downloadRate: traffic?.downloadRate || 0,
      totalUpload: traffic?.totalUpload || 0,
      totalDownload: traffic?.totalDownload || 0,
      lastUpdate: traffic?.timestamp ? new Date(traffic.timestamp) : null,
      userBandwidth: traffic?.userBandwidth || [],
    };
  }

  /**
   * Get comprehensive node detail with system status, traffic, and online users
   */
  async getNodeDetail(tenantId: string, nodeId: string) {
    const [node, systemStatus, trafficData, configVersions] = await Promise.all([
      this.prisma.node.findFirst({
        where: { id: nodeId, tenantId },
        include: {
          nodeGroup: true,
          inbounds: { where: { enable: true }, select: { id: true, tag: true, protocol: true, port: true } },
          outbounds: { where: { enable: true }, select: { id: true, tag: true, protocol: true } },
        },
      }),
      this.redis.getNodeStatus(nodeId) as Promise<NodeSystemStatus | null>,
      this.getNodeRealtimeBandwidth(tenantId, nodeId),
      this.prisma.configVersion.findMany({
        where: { nodeId },
        orderBy: { version: 'desc' },
        take: 10,
        select: { id: true, version: true, status: true, createdAt: true, appliedAt: true, errorMsg: true },
      }),
    ]);

    if (!node) return null;

    // Get online users from Redis instead of deleted ClientOnlineLog table
    const onlineUsersData = await this.redis.getOnlineUsers(nodeId, Date.now() - 60000);

    return {
      node: {
        id: node.id,
        name: node.name,
        status: node.status,
        publicIp: node.publicIp,
        countryCode: node.countryCode,
        countryName: node.countryName,
        city: node.city,
        isp: node.isp,
        nodeGroup: node.nodeGroup,
        lastSeenAt: node.lastSeenAt,
        systemInfo: node.systemInfo,
      },
      system: systemStatus ? {
        cpuUsage: systemStatus.cpuUsage,
        memoryUsage: systemStatus.memoryUsage,
        diskUsage: systemStatus.diskUsage,
        uptime: systemStatus.uptime,
        connections: systemStatus.connections,
        lastUpdate: new Date(systemStatus.timestamp),
      } : null,
      traffic: trafficData,
      inbounds: node.inbounds,
      outbounds: node.outbounds,
      onlineUsers: onlineUsersData || [],
      configVersions,
    };
  }

  /**
   * Get traffic history for charts - uses TrafficTimeSeries table
   */
  async getTrafficHistory(
    tenantId: string,
    entityType: 'node' | 'inbound' | 'client',
    entityId: string,
    period: 'hour' | 'day' | 'week' = 'hour',
    limit = 60,
  ) {
    // Verify entity belongs to tenant
    if (entityType === 'node') {
      const node = await this.prisma.node.findFirst({ where: { id: entityId, tenantId } });
      if (!node) return [];
    } else if (entityType === 'inbound') {
      const inbound = await this.prisma.inbound.findFirst({ where: { id: entityId, tenantId } });
      if (!inbound) return [];
    } else if (entityType === 'client') {
      const client = await this.prisma.client.findFirst({ where: { id: entityId, tenantId } });
      if (!client) return [];
    }

    // Calculate time range
    const now = new Date();
    let since: Date;
    switch (period) {
      case 'hour':
        since = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
        break;
      case 'day':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
    }

    const data = await this.prisma.trafficTimeSeries.findMany({
      where: {
        entityType,
        entityId,
        bucketTime: { gte: since },
      },
      orderBy: { bucketTime: 'asc' },
      take: limit,
    });

    return data.map(d => ({
      time: d.bucketTime,
      up: Number(d.up),
      down: Number(d.down),
    }));
  }

  /**
   * Get real-time bandwidth rate from Redis sliding window
   */
  async getBandwidthRate(entityType: 'node' | 'inbound' | 'client', entityId: string) {
    return this.redis.calculateBandwidthRate(entityType, entityId);
  }
}
