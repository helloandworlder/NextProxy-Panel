import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../redis/redis.constants';

/**
 * Cleans up old time-series data to prevent database bloat
 * Runs hourly to remove data older than retention period
 */
@Injectable()
@Processor(QUEUE_NAMES.TIMESERIES_CLEANUP)
export class TimeseriesCleanupProcessor extends WorkerHost {
  // Retention periods
  private readonly MINUTE_DATA_RETENTION_DAYS = 7;  // Keep 1-min buckets for 7 days
  private readonly NODE_STATS_RETENTION_DAYS = 30;  // Keep node stats for 30 days
  private readonly INBOUND_STATS_RETENTION_DAYS = 30;

  constructor(
    @InjectPinoLogger(TimeseriesCleanupProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting timeseries cleanup job');

    try {
      const now = new Date();
      
      // Clean TrafficTimeSeries (minute-level data)
      const minuteCutoff = new Date(now.getTime() - this.MINUTE_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deletedTimeSeries = await this.prisma.trafficTimeSeries.deleteMany({
        where: { bucketTime: { lt: minuteCutoff } },
      });
      
      // Clean NodeStats
      const nodeStatsCutoff = new Date(now.getTime() - this.NODE_STATS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deletedNodeStats = await this.prisma.nodeStats.deleteMany({
        where: { timestamp: { lt: nodeStatsCutoff } },
      });
      
      // Clean InboundStats
      const inboundStatsCutoff = new Date(now.getTime() - this.INBOUND_STATS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deletedInboundStats = await this.prisma.inboundStats.deleteMany({
        where: { timestamp: { lt: inboundStatsCutoff } },
      });

      this.logger.info({
        deletedTimeSeries: deletedTimeSeries.count,
        deletedNodeStats: deletedNodeStats.count,
        deletedInboundStats: deletedInboundStats.count,
      }, 'Timeseries cleanup completed');
    } catch (error) {
      this.logger.error('Timeseries cleanup failed', error);
      throw error;
    }
  }
}
