import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; latency?: number; error?: string };
    redis: { status: 'ok' | 'error'; latency?: number; error?: string };
  };
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async checkReadiness(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'ok' },
        redis: { status: 'ok' },
      },
    };

    // Check database
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      result.checks.database.latency = Date.now() - dbStart;
    } catch (error) {
      result.status = 'error';
      result.checks.database.status = 'error';
      result.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check Redis
    try {
      const redisStart = Date.now();
      await this.redis.ping();
      result.checks.redis.latency = Date.now() - redisStart;
    } catch (error) {
      result.status = 'error';
      result.checks.redis.status = 'error';
      result.checks.redis.error = error instanceof Error ? error.message : 'Unknown error';
    }

    if (result.status === 'error') {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
