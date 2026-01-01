import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../redis/redis.constants';

/**
 * Traffic Reset Processor
 * Note: In v3 schema, trafficResetDay field was removed.
 * This processor is kept for backward compatibility but does nothing.
 * Traffic reset should be handled via API calls or scheduled tasks based on business logic.
 */
@Injectable()
@Processor(QUEUE_NAMES.TRAFFIC_RESET)
export class TrafficResetProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(TrafficResetProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Traffic reset processor called - no-op in v3 schema');
    // In v3 schema, traffic reset is handled differently:
    // - Client.usedBytes tracks total usage
    // - ClientStats tracks per-node/inbound usage
    // - Reset should be triggered via API or external scheduler
  }
}
