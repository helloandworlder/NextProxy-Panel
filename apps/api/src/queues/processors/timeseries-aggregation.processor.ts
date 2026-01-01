import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES, REDIS_KEYS } from '../../redis/redis.constants';

/**
 * Aggregates traffic data from Redis to TrafficTimeSeries table
 * Runs every minute to create 1-minute buckets for charts
 */
@Injectable()
@Processor(QUEUE_NAMES.TIMESERIES_AGGREGATION)
export class TimeseriesAggregationProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(TimeseriesAggregationProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting timeseries aggregation job');

    try {
      const bucketTime = this.alignToMinute(new Date());
      
      // Process node traffic
      await this.aggregateNodeTraffic(bucketTime);
      
      // Process inbound traffic
      await this.aggregateInboundTraffic(bucketTime);
      
      // Process client traffic
      await this.aggregateClientTraffic(bucketTime);

      this.logger.debug('Timeseries aggregation completed');
    } catch (error) {
      this.logger.error('Timeseries aggregation failed', error);
      throw error;
    }
  }

  private alignToMinute(date: Date): Date {
    const aligned = new Date(date);
    aligned.setSeconds(0, 0);
    return aligned;
  }

  private async aggregateNodeTraffic(bucketTime: Date): Promise<void> {
    const upKeys = await this.redis.scanKeys(`${REDIS_KEYS.TRAFFIC_NODE_UP}*`);
    
    for (const upKey of upKeys) {
      const nodeId = upKey.replace(REDIS_KEYS.TRAFFIC_NODE_UP, '');
      const downKey = `${REDIS_KEYS.TRAFFIC_NODE_DOWN}${nodeId}`;
      
      // Get and reset counters atomically
      const client = this.redis.getClient();
      const [upStr, downStr] = await Promise.all([
        client.getdel(upKey),
        client.getdel(downKey),
      ]);
      
      const up = BigInt(upStr || '0');
      const down = BigInt(downStr || '0');
      
      if (up === 0n && down === 0n) continue;

      // Upsert to TrafficTimeSeries
      await this.prisma.trafficTimeSeries.upsert({
        where: {
          entityType_entityId_bucketTime: {
            entityType: 'node',
            entityId: nodeId,
            bucketTime,
          },
        },
        create: { entityType: 'node', entityId: nodeId, bucketTime, up, down },
        update: { up: { increment: up }, down: { increment: down } },
      });

      // Also update NodeStats (cumulative)
      await this.prisma.nodeStats.create({
        data: { nodeId, up, down, timestamp: bucketTime },
      });
    }
  }

  private async aggregateInboundTraffic(bucketTime: Date): Promise<void> {
    const upKeys = await this.redis.scanKeys(`${REDIS_KEYS.TRAFFIC_INBOUND_UP}*`);
    const client = this.redis.getClient();
    
    for (const upKey of upKeys) {
      const inboundId = upKey.replace(REDIS_KEYS.TRAFFIC_INBOUND_UP, '');
      const downKey = `${REDIS_KEYS.TRAFFIC_INBOUND_DOWN}${inboundId}`;
      
      const [upStr, downStr] = await Promise.all([
        client.getdel(upKey),
        client.getdel(downKey),
      ]);
      
      const up = BigInt(upStr || '0');
      const down = BigInt(downStr || '0');
      
      if (up === 0n && down === 0n) continue;

      // Upsert to TrafficTimeSeries
      await this.prisma.trafficTimeSeries.upsert({
        where: {
          entityType_entityId_bucketTime: {
            entityType: 'inbound',
            entityId: inboundId,
            bucketTime,
          },
        },
        create: { entityType: 'inbound', entityId: inboundId, bucketTime, up, down },
        update: { up: { increment: up }, down: { increment: down } },
      });

      // Also update InboundStats
      await this.prisma.inboundStats.create({
        data: { inboundId, up, down, timestamp: bucketTime },
      });
    }
  }

  private async aggregateClientTraffic(bucketTime: Date): Promise<void> {
    const upKeys = await this.redis.scanKeys(`${REDIS_KEYS.TRAFFIC_CLIENT_UP}*`);
    const client = this.redis.getClient();
    
    for (const upKey of upKeys) {
      const email = upKey.replace(REDIS_KEYS.TRAFFIC_CLIENT_UP, '');
      const downKey = `${REDIS_KEYS.TRAFFIC_CLIENT_DOWN}${email}`;
      
      const [upStr, downStr] = await Promise.all([
        client.getdel(upKey),
        client.getdel(downKey),
      ]);
      
      const up = BigInt(upStr || '0');
      const down = BigInt(downStr || '0');
      
      if (up === 0n && down === 0n) continue;

      // Find client by email
      const dbClient = await this.prisma.client.findFirst({
        where: { email },
        select: { id: true },
      });
      if (!dbClient) continue;

      // Upsert to TrafficTimeSeries
      await this.prisma.trafficTimeSeries.upsert({
        where: {
          entityType_entityId_bucketTime: {
            entityType: 'client',
            entityId: dbClient.id,
            bucketTime,
          },
        },
        create: { entityType: 'client', entityId: dbClient.id, bucketTime, up, down },
        update: { up: { increment: up }, down: { increment: down } },
      });

      // Update client usedBytes
      await this.prisma.client.update({
        where: { id: dbClient.id },
        data: { usedBytes: { increment: up + down } },
      });
    }
  }
}
