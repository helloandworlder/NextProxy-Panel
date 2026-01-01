import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Node } from '@prisma/client';

// Node 加入 NodeGroup 时的元数据
export interface NodeGroupMeta {
  maxBandwidthUp?: number;
  maxBandwidthDown?: number;
  maxSocks5Slots?: number;
  maxRelaySlots?: number;
  maxConnections?: number;
  continent?: string;
  country?: string;
  city?: string;
  region?: string;
  [key: string]: any;
}

// 负载均衡策略
export type LbStrategy =
  | 'round_robin'
  | 'random'
  | 'least_load'
  | 'least_slots'
  | 'least_bandwidth'
  | 'weighted'
  | 'geo_nearest';

// 负载均衡配置
export interface LbSettings {
  cpuWeight?: number;
  memWeight?: number;
  connWeight?: number;
  slotType?: 'socks5' | 'relay' | 'auto';
  weights?: {
    cpu?: number;
    memory?: number;
    connections?: number;
    socks5Usage?: number;
    relayUsage?: number;
    bandwidthUsage?: number;
  };
  maxCpuThreshold?: number;
  maxMemThreshold?: number;
  maxSlotUsageThreshold?: number;
  maxBandwidthThreshold?: number;
}

// 节点负载统计
export interface NodeLoadStats {
  node: Node;
  cpuUsage: number;
  memoryUsage: number;
  connections: number;
  bandwidthUp: number;
  bandwidthDown: number;
  socks5Allocated: number;
  relayAllocated: number;
  maxSocks5Slots: number;
  maxRelaySlots: number;
  maxBandwidthUp: number;
  maxBandwidthDown: number;
  socks5Usage: number;
  relayUsage: number;
  bandwidthUpUsage: number;
  bandwidthDownUsage: number;
  isHealthy: boolean;
  unhealthyCount: number;
}

// 节点选择选项
export interface SelectNodeOptions {
  clientIp?: string;
  excludeNodeIds?: string[];
  requireSocks5Slot?: boolean;
  requireRelaySlot?: boolean;
}

@Injectable()
export class NodeSelectorService {
  private readonly ROUND_ROBIN_KEY = 'lb:rr:';
  private readonly HEALTH_KEY = 'node:health:';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * 根据 NodeGroup 的 lbStrategy 选择节点
   */
  async selectNode(groupId: string, options?: SelectNodeOptions): Promise<Node | null> {
    const group = await this.prisma.nodeGroup.findUnique({
      where: { id: groupId },
      include: { nodes: { where: { status: 'online' } } },
    });

    if (!group || group.nodes.length === 0) return null;

    // 获取所有节点的负载统计
    const nodesWithStats = await this.getNodesLoadStats(group.nodes);

    // 过滤健康节点
    let candidates = nodesWithStats.filter((n) => n.isHealthy);

    // 排除指定节点
    if (options?.excludeNodeIds?.length) {
      candidates = candidates.filter((n) => !options.excludeNodeIds!.includes(n.node.id));
    }

    // 检查槽位需求
    if (options?.requireSocks5Slot) {
      candidates = candidates.filter((n) => n.socks5Allocated < n.maxSocks5Slots);
    }
    if (options?.requireRelaySlot) {
      candidates = candidates.filter((n) => n.relayAllocated < n.maxRelaySlots);
    }

    // 应用阈值过滤
    const settings = (group.lbSettings as LbSettings) || {};
    candidates = this.applyThresholdFilter(candidates, settings);

    if (candidates.length === 0) return null;

    const strategy = (group.lbStrategy as LbStrategy) || 'round_robin';

    switch (strategy) {
      case 'round_robin':
        return this.roundRobin(groupId, candidates);
      case 'random':
        return this.random(candidates);
      case 'least_load':
        return this.leastLoad(candidates, settings);
      case 'least_slots':
        return this.leastSlots(candidates, settings, options);
      case 'least_bandwidth':
        return this.leastBandwidth(candidates);
      case 'weighted':
        return this.weighted(candidates, settings);
      case 'geo_nearest':
        return this.geoNearest(candidates, options?.clientIp);
      default:
        return this.random(candidates);
    }
  }

  /**
   * 获取单个节点负载统计
   */
  async getNodeLoadStats(nodeId: string): Promise<NodeLoadStats | null> {
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) return null;

    const stats = await this.getNodesLoadStats([node]);
    return stats[0] || null;
  }

  /**
   * 获取 Group 内所有节点负载
   */
  async getGroupNodesLoad(groupId: string): Promise<NodeLoadStats[]> {
    const group = await this.prisma.nodeGroup.findUnique({
      where: { id: groupId },
      include: { nodes: true },
    });

    if (!group) return [];
    return this.getNodesLoadStats(group.nodes);
  }

  /**
   * 获取 Group 汇总统计
   */
  async getGroupStats(groupId: string): Promise<{
    groupId: string;
    totalNodes: number;
    onlineNodes: number;
    socks5: { used: number; total: number; usage: number };
    relay: { used: number; total: number; usage: number };
    bandwidth: { avgUp: number; avgDown: number; maxUp: number; maxDown: number };
    system: { avgCpu: number; avgMem: number; avgConn: number };
  }> {
    const nodesLoad = await this.getGroupNodesLoad(groupId);
    const onlineNodes = nodesLoad.filter((n) => n.node.status === 'online');

    const socks5Used = nodesLoad.reduce((sum, n) => sum + n.socks5Allocated, 0);
    const socks5Total = nodesLoad.reduce((sum, n) => sum + n.maxSocks5Slots, 0);
    const relayUsed = nodesLoad.reduce((sum, n) => sum + n.relayAllocated, 0);
    const relayTotal = nodesLoad.reduce((sum, n) => sum + n.maxRelaySlots, 0);

    const avgCpu = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, n) => sum + n.cpuUsage, 0) / onlineNodes.length
      : 0;
    const avgMem = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, n) => sum + n.memoryUsage, 0) / onlineNodes.length
      : 0;
    const avgConn = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, n) => sum + n.connections, 0) / onlineNodes.length
      : 0;

    const avgBwUp = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, n) => sum + n.bandwidthUp, 0) / onlineNodes.length
      : 0;
    const avgBwDown = onlineNodes.length > 0
      ? onlineNodes.reduce((sum, n) => sum + n.bandwidthDown, 0) / onlineNodes.length
      : 0;
    const maxBwUp = nodesLoad.reduce((sum, n) => sum + n.maxBandwidthUp, 0);
    const maxBwDown = nodesLoad.reduce((sum, n) => sum + n.maxBandwidthDown, 0);

    return {
      groupId,
      totalNodes: nodesLoad.length,
      onlineNodes: onlineNodes.length,
      socks5: { used: socks5Used, total: socks5Total, usage: socks5Total > 0 ? socks5Used / socks5Total : 0 },
      relay: { used: relayUsed, total: relayTotal, usage: relayTotal > 0 ? relayUsed / relayTotal : 0 },
      bandwidth: { avgUp: avgBwUp, avgDown: avgBwDown, maxUp: maxBwUp, maxDown: maxBwDown },
      system: { avgCpu, avgMem, avgConn },
    };
  }

  // === 私有方法 ===

  private async getNodesLoadStats(nodes: Node[]): Promise<NodeLoadStats[]> {
    const results: NodeLoadStats[] = [];

    for (const node of nodes) {
      const [systemStatus, businessStats, bandwidthStats, unhealthyCount] = await Promise.all([
        this.redis.getNodeStatus(node.id),
        this.getBusinessStats(node.id),
        this.redis.getBandwidthStats(node.id),
        this.getUnhealthyCount(node.id),
      ]);

      const meta = (node.groupMeta as NodeGroupMeta) || {};
      const status = systemStatus as any || {};

      const maxSocks5Slots = meta.maxSocks5Slots || 1000;
      const maxRelaySlots = meta.maxRelaySlots || 1000;
      const maxBandwidthUp = meta.maxBandwidthUp || 10000;
      const maxBandwidthDown = meta.maxBandwidthDown || 10000;

      results.push({
        node,
        cpuUsage: status.cpuUsage || 0,
        memoryUsage: status.memoryUsage || 0,
        connections: status.connections || 0,
        bandwidthUp: bandwidthStats?.avgUpMbps || 0,
        bandwidthDown: bandwidthStats?.avgDownMbps || 0,
        socks5Allocated: businessStats.socks5Allocated,
        relayAllocated: businessStats.relayAllocated,
        maxSocks5Slots,
        maxRelaySlots,
        maxBandwidthUp,
        maxBandwidthDown,
        socks5Usage: maxSocks5Slots > 0 ? businessStats.socks5Allocated / maxSocks5Slots : 0,
        relayUsage: maxRelaySlots > 0 ? businessStats.relayAllocated / maxRelaySlots : 0,
        bandwidthUpUsage: maxBandwidthUp > 0 ? (bandwidthStats?.avgUpMbps || 0) / maxBandwidthUp : 0,
        bandwidthDownUsage: maxBandwidthDown > 0 ? (bandwidthStats?.avgDownMbps || 0) / maxBandwidthDown : 0,
        isHealthy: unhealthyCount < 3,
        unhealthyCount,
      });
    }

    return results;
  }

  private async getBusinessStats(nodeId: string): Promise<{ socks5Allocated: number; relayAllocated: number }> {
    const [socks5Count, relayCount] = await Promise.all([
      this.prisma.outbound.count({
        where: { nodeId, tag: { startsWith: 'gosea-socks5-' }, enable: true },
      }),
      this.prisma.goSeaRelayEndpoint.count({
        where: { nodeId, status: 'active' },
      }),
    ]);

    return { socks5Allocated: socks5Count, relayAllocated: relayCount };
  }

  private async getUnhealthyCount(nodeId: string): Promise<number> {
    const count = await this.redis.get(`${this.HEALTH_KEY}${nodeId}`);
    return parseInt(count || '0', 10);
  }

  private applyThresholdFilter(nodes: NodeLoadStats[], settings: LbSettings): NodeLoadStats[] {
    const maxCpu = settings.maxCpuThreshold ?? 90;
    const maxMem = settings.maxMemThreshold ?? 90;
    const maxSlot = settings.maxSlotUsageThreshold ?? 95;
    const maxBw = settings.maxBandwidthThreshold ?? 90;

    return nodes.filter((n) => {
      if (n.cpuUsage > maxCpu) return false;
      if (n.memoryUsage > maxMem) return false;
      if (n.socks5Usage * 100 > maxSlot && n.relayUsage * 100 > maxSlot) return false;
      if (n.bandwidthUpUsage * 100 > maxBw || n.bandwidthDownUsage * 100 > maxBw) return false;
      return true;
    });
  }

  // === 负载均衡策略实现 ===

  private async roundRobin(groupId: string, nodes: NodeLoadStats[]): Promise<Node> {
    const key = `${this.ROUND_ROBIN_KEY}${groupId}`;
    const index = await this.redis.incr(key);
    await this.redis.expire(key, 3600);
    return nodes[index % nodes.length].node;
  }

  private random(nodes: NodeLoadStats[]): Node {
    return nodes[Math.floor(Math.random() * nodes.length)].node;
  }

  private leastLoad(nodes: NodeLoadStats[], settings: LbSettings): Node {
    const cpuW = settings.cpuWeight ?? 0.3;
    const memW = settings.memWeight ?? 0.3;
    const connW = settings.connWeight ?? 0.4;

    return nodes.reduce((best, curr) => {
      const currScore = curr.cpuUsage * cpuW + curr.memoryUsage * memW + (curr.connections / 1000) * connW;
      const bestScore = best.cpuUsage * cpuW + best.memoryUsage * memW + (best.connections / 1000) * connW;
      return currScore < bestScore ? curr : best;
    }).node;
  }

  private leastSlots(nodes: NodeLoadStats[], settings: LbSettings, options?: SelectNodeOptions): Node {
    let slotType = settings.slotType || 'auto';

    if (slotType === 'auto') {
      slotType = options?.requireSocks5Slot ? 'socks5' : options?.requireRelaySlot ? 'relay' : 'socks5';
    }

    return nodes.reduce((best, curr) => {
      const currUsage = slotType === 'socks5' ? curr.socks5Usage : curr.relayUsage;
      const bestUsage = slotType === 'socks5' ? best.socks5Usage : best.relayUsage;
      return currUsage < bestUsage ? curr : best;
    }).node;
  }

  private leastBandwidth(nodes: NodeLoadStats[]): Node {
    return nodes.reduce((best, curr) => {
      const currUsage = (curr.bandwidthUpUsage + curr.bandwidthDownUsage) / 2;
      const bestUsage = (best.bandwidthUpUsage + best.bandwidthDownUsage) / 2;
      return currUsage < bestUsage ? curr : best;
    }).node;
  }

  private weighted(nodes: NodeLoadStats[], settings: LbSettings): Node {
    const w = settings.weights || {};
    const cpuW = w.cpu ?? 0.15;
    const memW = w.memory ?? 0.15;
    const connW = w.connections ?? 0.1;
    const socks5W = w.socks5Usage ?? 0.2;
    const relayW = w.relayUsage ?? 0.2;
    const bwW = w.bandwidthUsage ?? 0.2;

    return nodes.reduce((best, curr) => {
      const currScore =
        (curr.cpuUsage / 100) * cpuW +
        (curr.memoryUsage / 100) * memW +
        (curr.connections / 10000) * connW +
        curr.socks5Usage * socks5W +
        curr.relayUsage * relayW +
        ((curr.bandwidthUpUsage + curr.bandwidthDownUsage) / 2) * bwW;

      const bestScore =
        (best.cpuUsage / 100) * cpuW +
        (best.memoryUsage / 100) * memW +
        (best.connections / 10000) * connW +
        best.socks5Usage * socks5W +
        best.relayUsage * relayW +
        ((best.bandwidthUpUsage + best.bandwidthDownUsage) / 2) * bwW;

      return currScore < bestScore ? curr : best;
    }).node;
  }

  private geoNearest(nodes: NodeLoadStats[], _clientIp?: string): Node {
    // TODO: 接入 GeoIP 服务实现真正的地理位置匹配
    // 目前 fallback 到 random
    return this.random(nodes);
  }
}
