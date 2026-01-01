import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from '../redis/redis.constants';
import { TrafficAggregationProcessor } from './processors/traffic-aggregation.processor';
import { TrafficResetProcessor } from './processors/traffic-reset.processor';
import { NodeHealthCheckProcessor } from './processors/node-health-check.processor';
import { ClientExpiryCheckProcessor } from './processors/client-expiry-check.processor';
import { OnlineCleanupProcessor } from './processors/online-cleanup.processor';
import { TimeseriesAggregationProcessor } from './processors/timeseries-aggregation.processor';
import { TimeseriesCleanupProcessor } from './processors/timeseries-cleanup.processor';
import { CronScheduler } from './cron.scheduler';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRAFFIC_AGGREGATION },
      { name: QUEUE_NAMES.TRAFFIC_RESET },
      { name: QUEUE_NAMES.NODE_HEALTH_CHECK },
      { name: QUEUE_NAMES.CLIENT_EXPIRY_CHECK },
      { name: QUEUE_NAMES.ONLINE_CLEANUP },
      { name: QUEUE_NAMES.STATS_SNAPSHOT },
      { name: QUEUE_NAMES.TIMESERIES_AGGREGATION },
      { name: QUEUE_NAMES.TIMESERIES_CLEANUP },
    ),
  ],
  providers: [
    TrafficAggregationProcessor,
    TrafficResetProcessor,
    NodeHealthCheckProcessor,
    ClientExpiryCheckProcessor,
    OnlineCleanupProcessor,
    TimeseriesAggregationProcessor,
    TimeseriesCleanupProcessor,
    CronScheduler,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
