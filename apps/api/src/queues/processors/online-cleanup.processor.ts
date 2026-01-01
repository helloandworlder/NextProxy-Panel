import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { QUEUE_NAMES, REDIS_KEYS } from '../../redis/redis.constants';

@Injectable()
@Processor(QUEUE_NAMES.ONLINE_CLEANUP)
export class OnlineCleanupProcessor extends WorkerHost {
  // Consider user offline if no activity for 2 minutes
  private readonly OFFLINE_THRESHOLD_MS = 120000;

  constructor(
    @InjectPinoLogger(OnlineCleanupProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting online cleanup job');

    try {
      const threshold = Date.now() - this.OFFLINE_THRESHOLD_MS;

      // Clean up Redis online user sets
      const keys = await this.redis.scanKeys(`${REDIS_KEYS.ONLINE_USERS}*`);
      let totalRemoved = 0;

      for (const key of keys) {
        const nodeId = key.replace(REDIS_KEYS.ONLINE_USERS, '');
        const removed = await this.redis.removeOfflineUsers(nodeId, threshold);
        totalRemoved += removed;
      }

      if (totalRemoved > 0) {
        this.logger.info(`Removed ${totalRemoved} stale online user records from Redis`);
      }

      // Note: ClientOnlineLog table has been removed in v3 schema
      // Online user tracking is now handled entirely in Redis

      this.logger.debug('Online cleanup completed');
    } catch (error) {
      this.logger.error('Online cleanup failed', error);
      throw error;
    }
  }
}
