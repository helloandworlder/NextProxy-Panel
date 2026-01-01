import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES } from '../../redis/redis.constants';
import { Node } from '@prisma/client';

interface HealthCheckConfig {
  enabled: boolean;
  intervalSeconds: number;
  timeoutSeconds: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  maxCpuUsage?: number;
  maxMemUsage?: number;
  maxSlotUsage?: number;
}

const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  enabled: true,
  intervalSeconds: 30,
  timeoutSeconds: 60,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
};

@Injectable()
@Processor(QUEUE_NAMES.NODE_HEALTH_CHECK)
export class NodeHealthCheckProcessor extends WorkerHost {
  private readonly HEALTH_KEY = 'node:health:';
  private readonly RECOVERY_KEY = 'node:recovery:';

  constructor(
    @InjectPinoLogger(NodeHealthCheckProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting node health check job');

    try {
      const groups = await this.prisma.nodeGroup.findMany({
        include: { nodes: true },
      });

      const checkedNodeIds = new Set<string>();

      for (const group of groups) {
        const config = this.parseHealthConfig(group.healthCheck);
        if (!config.enabled) continue;

        for (const node of group.nodes) {
          checkedNodeIds.add(node.id);
          await this.checkNodeHealth(node, config);
        }
      }

      await this.checkUngroupedNodes(checkedNodeIds);
      this.logger.debug('Node health check completed');
    } catch (error) {
      this.logger.error('Node health check failed', error);
      throw error;
    }
  }

  private parseHealthConfig(healthCheck: unknown): HealthCheckConfig {
    const config = healthCheck as Partial<HealthCheckConfig> | null;
    return {
      enabled: config?.enabled ?? DEFAULT_HEALTH_CONFIG.enabled,
      intervalSeconds: config?.intervalSeconds ?? DEFAULT_HEALTH_CONFIG.intervalSeconds,
      timeoutSeconds: config?.timeoutSeconds ?? DEFAULT_HEALTH_CONFIG.timeoutSeconds,
      unhealthyThreshold: config?.unhealthyThreshold ?? DEFAULT_HEALTH_CONFIG.unhealthyThreshold,
      healthyThreshold: config?.healthyThreshold ?? DEFAULT_HEALTH_CONFIG.healthyThreshold,
      maxCpuUsage: config?.maxCpuUsage,
      maxMemUsage: config?.maxMemUsage,
      maxSlotUsage: config?.maxSlotUsage,
    };
  }

  private async checkNodeHealth(node: Node, config: HealthCheckConfig): Promise<void> {
    const healthKey = `${this.HEALTH_KEY}${node.id}`;
    const recoveryKey = `${this.RECOVERY_KEY}${node.id}`;
    const isHealthy = await this.evaluateHealth(node, config);

    if (!isHealthy) {
      const count = await this.redis.incr(healthKey);
      await this.redis.del(recoveryKey);
      await this.redis.expire(healthKey, 600);

      if (count >= config.unhealthyThreshold && node.status === 'online') {
        await this.markOffline(node);
      }
    } else {
      if (node.status === 'offline') {
        const recoveryCount = await this.redis.incr(recoveryKey);
        await this.redis.expire(recoveryKey, 300);

        if (recoveryCount >= config.healthyThreshold) {
          await this.markOnline(node);
          await this.redis.del(healthKey);
          await this.redis.del(recoveryKey);
        }
      } else {
        await this.redis.del(healthKey);
      }
    }
  }

  private async evaluateHealth(node: Node, config: HealthCheckConfig): Promise<boolean> {
    const lastSeen = node.lastSeenAt?.getTime() || 0;
    if (Date.now() - lastSeen > config.timeoutSeconds * 1000) {
      return false;
    }

    const status = (await this.redis.getNodeStatus(node.id)) as {
      cpuUsage?: number;
      memoryUsage?: number;
    } | null;

    if (status) {
      if (config.maxCpuUsage && status.cpuUsage && status.cpuUsage > config.maxCpuUsage) {
        return false;
      }
      if (config.maxMemUsage && status.memoryUsage && status.memoryUsage > config.maxMemUsage) {
        return false;
      }
    }

    if (config.maxSlotUsage) {
      const meta = node.groupMeta as { maxSocks5Slots?: number; maxRelaySlots?: number } | null;
      if (meta) {
        const [socks5Count, relayCount] = await Promise.all([
          this.prisma.outbound.count({
            where: { nodeId: node.id, tag: { startsWith: 'gosea-socks5-' }, enable: true },
          }),
          this.prisma.goSeaRelayEndpoint.count({
            where: { nodeId: node.id, status: 'active' },
          }),
        ]);

        const maxSlots = (meta.maxSocks5Slots || 1000) + (meta.maxRelaySlots || 1000);
        const usedSlots = socks5Count + relayCount;
        if ((usedSlots / maxSlots) * 100 > config.maxSlotUsage) {
          return false;
        }
      }
    }

    return true;
  }

  private async markOffline(node: Node): Promise<void> {
    await this.prisma.node.update({
      where: { id: node.id },
      data: { status: 'offline' },
    });
    this.logger.warn(`Node ${node.name} (${node.id}) marked offline due to health check failure`);
  }

  private async markOnline(node: Node): Promise<void> {
    await this.prisma.node.update({
      where: { id: node.id },
      data: { status: 'online' },
    });
    this.logger.info(`Node ${node.name} (${node.id}) recovered and marked online`);
  }

  private async checkUngroupedNodes(checkedNodeIds: Set<string>): Promise<void> {
    const threshold = new Date(Date.now() - DEFAULT_HEALTH_CONFIG.timeoutSeconds * 1000);

    const result = await this.prisma.node.updateMany({
      where: {
        status: 'online',
        nodeGroupId: null,
        id: { notIn: Array.from(checkedNodeIds) },
        lastSeenAt: { lt: threshold },
      },
      data: { status: 'offline' },
    });

    if (result.count > 0) {
      this.logger.warn(`Marked ${result.count} ungrouped nodes as offline due to no heartbeat`);
    }
  }
}
