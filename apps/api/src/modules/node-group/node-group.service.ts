import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateNodeGroupDto, UpdateNodeGroupDto } from './dto/node-group.dto';

// Predefined node group type templates
export const NODE_GROUP_TEMPLATES = {
  residential_socks5: {
    schemaFields: [
      { name: 'continent', type: 'select', required: true, options: ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'] },
      { name: 'country', type: 'select', required: true, options: ['US', 'JP', 'HK', 'TW', 'SG', 'KR', 'UK', 'DE', 'FR', 'AU', 'CA', 'NL', 'RU', 'BR', 'IN'] },
      { name: 'city', type: 'string', required: true },
      { name: 'maxSocks5Slots', type: 'number', required: false, default: 1000 },
      { name: 'maxBandwidthUp', type: 'number', required: false, default: 1000, unit: 'Mbps' },
      { name: 'maxBandwidthDown', type: 'number', required: false, default: 1000, unit: 'Mbps' },
      { name: 'weight', type: 'number', required: false, default: 100 },
    ],
    requiredTags: ['Residential', 'Socks5-Only'],
    defaultLbStrategy: 'least_slots',
  },
  relay: {
    schemaFields: [
      { name: 'region', type: 'select', required: true, options: ['HK', 'TW', 'JP', 'SG', 'US-West', 'US-East', 'EU', 'KR', 'AU'] },
      { name: 'maxRelaySlots', type: 'number', required: false, default: 1000 },
      { name: 'maxBandwidthUp', type: 'number', required: false, default: 2000, unit: 'Mbps' },
      { name: 'maxBandwidthDown', type: 'number', required: false, default: 2000, unit: 'Mbps' },
      { name: 'weight', type: 'number', required: false, default: 100 },
    ],
    requiredTags: ['Relay'],
    defaultLbStrategy: 'least_bandwidth',
  },
  custom: {
    schemaFields: [
      { name: 'maxSocks5Slots', type: 'number', required: false, default: 1000 },
      { name: 'maxRelaySlots', type: 'number', required: false, default: 1000 },
      { name: 'maxBandwidthUp', type: 'number', required: false, default: 1000, unit: 'Mbps' },
      { name: 'maxBandwidthDown', type: 'number', required: false, default: 1000, unit: 'Mbps' },
      { name: 'weight', type: 'number', required: false, default: 100 },
    ],
    requiredTags: [],
    defaultLbStrategy: 'round_robin',
  },
};

@Injectable()
export class NodeGroupService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(tenantId: string, dto: CreateNodeGroupDto) {
    // Apply template if groupType is predefined
    const template = NODE_GROUP_TEMPLATES[dto.groupType as keyof typeof NODE_GROUP_TEMPLATES] || NODE_GROUP_TEMPLATES.custom;
    
    return this.prisma.nodeGroup.create({
      data: {
        tenantId,
        name: dto.name,
        groupType: dto.groupType || 'custom',
        schemaFields: dto.schemaFields || template.schemaFields,
        requiredTags: dto.requiredTags || template.requiredTags,
        lbStrategy: dto.lbStrategy || 'round_robin',
        lbSettings: dto.lbSettings || {},
        healthCheck: dto.healthCheck || {
          enabled: true,
          intervalSeconds: 30,
          timeoutSeconds: 5,
          unhealthyThreshold: 3,
        },
        remark: dto.remark,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.nodeGroup.findMany({
      where: { tenantId },
      include: { 
        nodes: { select: { id: true, name: true, status: true } },
        _count: { select: { nodes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByType(tenantId: string, groupType: string) {
    return this.prisma.nodeGroup.findMany({
      where: { tenantId, groupType },
      include: { nodes: { where: { status: 'online' } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const group = await this.prisma.nodeGroup.findFirst({
      where: { id, tenantId },
      include: { nodes: true },
    });
    if (!group) throw new NotFoundException('Node group not found');
    return group;
  }

  async update(tenantId: string, id: string, dto: UpdateNodeGroupDto) {
    await this.findOne(tenantId, id);
    return this.prisma.nodeGroup.update({
      where: { id },
      data: {
        name: dto.name,
        groupType: dto.groupType,
        schemaFields: dto.schemaFields,
        requiredTags: dto.requiredTags,
        lbStrategy: dto.lbStrategy,
        lbSettings: dto.lbSettings,
        healthCheck: dto.healthCheck,
        remark: dto.remark,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.nodeGroup.delete({ where: { id } });
  }

  async addNode(tenantId: string, groupId: string, nodeId: string) {
    await this.findOne(tenantId, groupId);
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { nodeGroupId: groupId },
    });
  }

  async removeNode(tenantId: string, groupId: string, nodeId: string) {
    await this.findOne(tenantId, groupId);
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { nodeGroupId: null },
    });
  }

  // Get available templates
  getTemplates() {
    return NODE_GROUP_TEMPLATES;
  }

  // Get group statistics for load balancing
  async getGroupStats(tenantId: string, groupId: string) {
    const group = await this.findOne(tenantId, groupId);
    const nodeIds = group.nodes.map((n) => n.id);

    if (nodeIds.length === 0) {
      return {
        groupId,
        groupName: group.name,
        totalNodes: 0,
        onlineNodes: 0,
        totalSocks5Slots: 0,
        usedSocks5Slots: 0,
        totalRelaySlots: 0,
        usedRelaySlots: 0,
        avgBandwidthUp: 0,
        avgBandwidthDown: 0,
        nodes: [],
      };
    }

    // Get slot counts
    const [socks5Counts, relayCounts] = await Promise.all([
      this.prisma.outbound.groupBy({
        by: ['nodeId'],
        where: { nodeId: { in: nodeIds }, tag: { startsWith: 'gosea-socks5-' }, enable: true },
        _count: true,
      }),
      this.prisma.goSeaRelayEndpoint.groupBy({
        by: ['nodeId'],
        where: { nodeId: { in: nodeIds }, status: 'active' },
        _count: true,
      }),
    ]);

    const socks5Map = new Map(socks5Counts.map((c) => [c.nodeId, c._count]));
    const relayMap = new Map(relayCounts.map((c) => [c.nodeId, c._count]));

    // Build node stats
    const nodeStats = await Promise.all(
      group.nodes.map(async (node) => {
        const meta = (node.groupMeta as Record<string, number>) || {};
        const bandwidth = await this.redis.getBandwidthStats(node.id);

        return {
          nodeId: node.id,
          nodeName: node.name,
          status: node.status,
          socks5Slots: {
            used: socks5Map.get(node.id) || 0,
            max: meta.maxSocks5Slots || 1000,
          },
          relaySlots: {
            used: relayMap.get(node.id) || 0,
            max: meta.maxRelaySlots || 1000,
          },
          bandwidth: bandwidth || { avgUpMbps: 0, avgDownMbps: 0 },
          weight: meta.weight || 100,
        };
      }),
    );

    const onlineNodes = nodeStats.filter((n) => n.status === 'online');

    return {
      groupId,
      groupName: group.name,
      groupType: group.groupType,
      lbStrategy: group.lbStrategy,
      totalNodes: nodeStats.length,
      onlineNodes: onlineNodes.length,
      totalSocks5Slots: nodeStats.reduce((sum, n) => sum + n.socks5Slots.max, 0),
      usedSocks5Slots: nodeStats.reduce((sum, n) => sum + n.socks5Slots.used, 0),
      totalRelaySlots: nodeStats.reduce((sum, n) => sum + n.relaySlots.max, 0),
      usedRelaySlots: nodeStats.reduce((sum, n) => sum + n.relaySlots.used, 0),
      avgBandwidthUp: onlineNodes.length > 0
        ? Math.round(onlineNodes.reduce((sum, n) => sum + n.bandwidth.avgUpMbps, 0) / onlineNodes.length * 100) / 100
        : 0,
      avgBandwidthDown: onlineNodes.length > 0
        ? Math.round(onlineNodes.reduce((sum, n) => sum + n.bandwidth.avgDownMbps, 0) / onlineNodes.length * 100) / 100
        : 0,
      nodes: nodeStats,
    };
  }
}
