import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../redis/redis.constants';

@Injectable()
@Processor(QUEUE_NAMES.CLIENT_EXPIRY_CHECK)
export class ClientExpiryCheckProcessor extends WorkerHost {
  constructor(
    @InjectPinoLogger(ClientExpiryCheckProcessor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.debug('Starting client expiry check job');

    try {
      const now = Date.now();

      // Disable expired clients (expiryTime > 0 means has expiry)
      const expiredResult = await this.prisma.client.updateMany({
        where: {
          enable: true,
          expiryTime: { gt: 0, lt: BigInt(now) },
        },
        data: { enable: false },
      });

      if (expiredResult.count > 0) {
        this.logger.info(`Disabled ${expiredResult.count} expired clients`);
      }

      // Disable over-quota clients (totalBytes > 0 means has quota)
      const overQuotaResult = await this.prisma.$executeRaw`
        UPDATE clients 
        SET enable = false 
        WHERE enable = true 
          AND total_bytes > 0 
          AND used_bytes >= total_bytes
      `;

      if (overQuotaResult > 0) {
        this.logger.info(`Disabled ${overQuotaResult} over-quota clients`);
      }

      this.logger.debug('Client expiry check completed');
    } catch (error) {
      this.logger.error('Client expiry check failed', error);
      throw error;
    }
  }
}
