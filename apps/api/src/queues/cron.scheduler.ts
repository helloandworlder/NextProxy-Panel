import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../redis/redis.constants';

@Injectable()
export class CronScheduler implements OnModuleInit {
  constructor(
    @InjectPinoLogger(CronScheduler.name)
    private readonly logger: PinoLogger,
    @InjectQueue(QUEUE_NAMES.TRAFFIC_AGGREGATION)
    private trafficQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TRAFFIC_RESET)
    private trafficResetQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NODE_HEALTH_CHECK)
    private healthCheckQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLIENT_EXPIRY_CHECK)
    private expiryCheckQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ONLINE_CLEANUP)
    private onlineCleanupQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TIMESERIES_AGGREGATION)
    private timeseriesAggQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TIMESERIES_CLEANUP)
    private timeseriesCleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.info('Initializing cron schedulers...');

    // Clear existing repeatable jobs to avoid duplicates
    await this.clearExistingJobs();

    // Traffic aggregation: every 5 seconds (for 5s reporting interval)
    await this.trafficQueue.add(
      'aggregate',
      {},
      {
        repeat: { every: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    this.logger.info('Traffic aggregation scheduled: every 5s');

    // Traffic reset: daily at 00:05 (check for monthly reset)
    await this.trafficResetQueue.add(
      'reset',
      {},
      {
        repeat: { pattern: '5 0 * * *' }, // 00:05 daily
        removeOnComplete: 30,
        removeOnFail: 10,
      },
    );
    this.logger.info('Traffic reset scheduled: daily at 00:05');

    // Node health check: every 30 seconds
    await this.healthCheckQueue.add(
      'check',
      {},
      {
        repeat: { every: 30000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    this.logger.info('Node health check scheduled: every 30s');

    // Client expiry check: every 60 seconds
    await this.expiryCheckQueue.add(
      'check',
      {},
      {
        repeat: { every: 60000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    this.logger.info('Client expiry check scheduled: every 60s');

    // Online cleanup: every 5 minutes
    await this.onlineCleanupQueue.add(
      'cleanup',
      {},
      {
        repeat: { every: 300000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );
    this.logger.info('Online cleanup scheduled: every 5min');

    // Timeseries aggregation: every 60 seconds (1-minute buckets)
    await this.timeseriesAggQueue.add(
      'aggregate',
      {},
      {
        repeat: { every: 60000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    this.logger.info('Timeseries aggregation scheduled: every 60s');

    // Timeseries cleanup: every hour
    await this.timeseriesCleanupQueue.add(
      'cleanup',
      {},
      {
        repeat: { every: 3600000 },
        removeOnComplete: 24,
        removeOnFail: 10,
      },
    );
    this.logger.info('Timeseries cleanup scheduled: every 1h');

    this.logger.info('All cron schedulers initialized');
  }

  private async clearExistingJobs() {
    const queues = [
      this.trafficQueue,
      this.trafficResetQueue,
      this.healthCheckQueue,
      this.expiryCheckQueue,
      this.onlineCleanupQueue,
      this.timeseriesAggQueue,
      this.timeseriesCleanupQueue,
    ];

    for (const queue of queues) {
      const repeatableJobs = await queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await queue.removeRepeatableByKey(job.key);
      }
    }
  }
}
