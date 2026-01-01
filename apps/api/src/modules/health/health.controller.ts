import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Basic health check - returns ok if API is running' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - verifies DB and Redis connections' })
  @ApiResponse({ status: 200, description: 'All dependencies are ready' })
  @ApiResponse({ status: 503, description: 'One or more dependencies are not ready' })
  async ready() {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check - basic check for container orchestration' })
  @ApiResponse({ status: 200, description: 'API is alive' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
