import { Controller, Get, Param, Query, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StatsService } from './stats.service';
import { RequireScopes } from '../auth/decorators';
import { ScopesGuard } from '../auth/guards';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ScopesGuard)
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get tenant overview statistics' })
  @RequireScopes('stats:read')
  getOverview(@Req() req: AuthenticatedRequest) {
    return this.statsService.getOverview(req.user.tenantId);
  }

  @Get('nodes/:nodeId')
  @ApiOperation({ summary: 'Get node statistics' })
  @RequireScopes('stats:read')
  getNodeStats(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.statsService.getNodeStats(req.user.tenantId, nodeId);
  }

  @Get('nodes/:nodeId/detail')
  @ApiOperation({ summary: 'Get comprehensive node detail with system status, traffic, and online users' })
  @RequireScopes('stats:read')
  async getNodeDetail(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    const result = await this.statsService.getNodeDetail(req.user.tenantId, nodeId);
    if (!result) {
      throw new NotFoundException('Node not found');
    }
    return result;
  }

  @Get('bandwidth')
  @ApiOperation({ summary: 'Get real-time bandwidth for all nodes' })
  @RequireScopes('stats:read')
  getRealtimeBandwidth(@Req() req: AuthenticatedRequest) {
    return this.statsService.getRealtimeBandwidth(req.user.tenantId);
  }

  @Get('bandwidth/:nodeId')
  @ApiOperation({ summary: 'Get real-time bandwidth for a specific node' })
  @RequireScopes('stats:read')
  async getNodeRealtimeBandwidth(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    const result = await this.statsService.getNodeRealtimeBandwidth(req.user.tenantId, nodeId);
    if (!result) {
      throw new NotFoundException('Node not found');
    }
    return result;
  }

  @Get('traffic-history')
  @ApiOperation({ summary: 'Get traffic history for charts' })
  @ApiQuery({ name: 'entityType', required: true, enum: ['node', 'inbound', 'client'] })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiQuery({ name: 'period', required: false, enum: ['hour', 'day', 'week'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequireScopes('stats:read')
  getTrafficHistory(
    @Req() req: AuthenticatedRequest,
    @Query('entityType') entityType: 'node' | 'inbound' | 'client',
    @Query('entityId') entityId: string,
    @Query('period') period?: 'hour' | 'day' | 'week',
    @Query('limit') limit?: string,
  ) {
    return this.statsService.getTrafficHistory(
      req.user.tenantId,
      entityType,
      entityId,
      period || 'hour',
      limit ? parseInt(limit, 10) : 60,
    );
  }

  @Get('bandwidth-rate/:entityType/:entityId')
  @ApiOperation({ summary: 'Get real-time bandwidth rate from Redis' })
  @RequireScopes('stats:read')
  getBandwidthRate(
    @Param('entityType') entityType: 'node' | 'inbound' | 'client',
    @Param('entityId') entityId: string,
  ) {
    return this.statsService.getBandwidthRate(entityType, entityId);
  }
}
