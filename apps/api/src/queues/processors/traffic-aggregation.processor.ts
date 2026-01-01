import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES, REDIS_KEYS } from '../../redis/redis.constants';

@Injectable()
@Processor(QUEUE_NAMES.TRAFFIC_AGGREGATION)
export class TrafficAggregationProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(TrafficAggregationProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting traffic aggregation job');

    try {
      const keys = await this.redis.getAllTrafficBufferKeys();
      
      if (keys.length === 0) {
        this.logger.debug('No traffic buffers to process');
        return;
      }

      for (const key of keys) {
        const nodeId = key.replace(REDIS_KEYS.TRAFFIC_BUFFER, '');
        await this.processNodeTraffic(nodeId);
      }

      this.logger.debug(`Processed traffic for ${keys.length} nodes`);
    } catch (error) {
      this.logger.error('Traffic aggregation failed', error);
      throw error;
    }
  }

  private async processNodeTraffic(nodeId: string): Promise<void> {
    const trafficBatches = await this.redis.popAllTraffic(nodeId);
    if (trafficBatches.length === 0) return;

    // Get node info for tenantId
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, tenantId: true },
    });
    if (!node) return;

    // Aggregate by email (client level)
    const clientAgg = new Map<string, { upload: number; download: number }>();

    for (const batch of trafficBatches) {
      const items = batch as any[];
      for (const item of items) {
        if (item.email) {
          const existing = clientAgg.get(item.email) || { upload: 0, download: 0 };
          existing.upload += item.upload || 0;
          existing.download += item.download || 0;
          clientAgg.set(item.email, existing);
        }
      }
    }

    const now = new Date();

    // Get all inbounds for this node to map tags to IDs
    const inbounds = await this.prisma.inbound.findMany({
      where: { nodeId },
      select: { id: true, tag: true },
    });
    const inboundMap = new Map(inbounds.map(i => [i.tag, i.id]));

    await this.prisma.$transaction(async (tx) => {
      // Process client traffic using ClientStats (3x-ui style)
      for (const [email, traffic] of clientAgg) {
        const client = await tx.client.findFirst({
          where: { email },
          select: { id: true, inboundTags: true },
        });
        if (!client) continue;

        const totalBytes = BigInt(traffic.upload + traffic.download);
        
        // Update client used bytes
        await tx.client.update({
          where: { id: client.id },
          data: { usedBytes: { increment: totalBytes } },
        });

        // Upsert ClientStats for each inbound the client has access to
        for (const tag of client.inboundTags) {
          const inboundId = inboundMap.get(tag);
          if (!inboundId) continue;

          await tx.clientStats.upsert({
            where: {
              clientId_nodeId_inboundId: {
                clientId: client.id,
                nodeId,
                inboundId,
              },
            },
            create: {
              clientId: client.id,
              nodeId,
              inboundId,
              up: BigInt(traffic.upload),
              down: BigInt(traffic.download),
            },
            update: {
              up: { increment: BigInt(traffic.upload) },
              down: { increment: BigInt(traffic.download) },
              recordedAt: now,
            },
          });
        }
      }
    });

    this.logger.debug(`Aggregated traffic for ${clientAgg.size} clients on node ${nodeId}`);
  }
}
