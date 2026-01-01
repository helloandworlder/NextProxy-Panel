/**
 * Config Version Controller
 * REST API for configuration version management
 */

import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ConfigVersionService } from './config-version.service';
import { RollbackConfigDto } from './dto/config-version.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../auth/decorators/user.decorator';

@Controller('config-versions')
@UseGuards(JwtAuthGuard)
export class ConfigVersionController {
  constructor(private readonly configVersionService: ConfigVersionService) {}

  /**
   * Get version history for a node
   */
  @Get('node/:nodeId')
  async getVersionHistory(
    @TenantId() tenantId: string,
    @Param('nodeId') nodeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.configVersionService.getVersionHistory(
      tenantId,
      nodeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Get current applied version for a node
   */
  @Get('node/:nodeId/current')
  async getCurrentVersion(
    @TenantId() tenantId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.configVersionService.getCurrentVersion(nodeId);
  }

  /**
   * Get a specific version
   */
  @Get(':versionId')
  async getVersion(
    @TenantId() tenantId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.configVersionService.getVersion(tenantId, versionId);
  }

  /**
   * Compare two versions
   */
  @Get('compare')
  async compareVersions(
    @TenantId() tenantId: string,
    @Query('v1') versionId1: string,
    @Query('v2') versionId2: string,
  ) {
    return this.configVersionService.compareVersions(tenantId, versionId1, versionId2);
  }

  /**
   * Create a new version snapshot (manual)
   */
  @Post('node/:nodeId/snapshot')
  async createSnapshot(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('nodeId') nodeId: string,
    @Body('reason') reason?: string,
  ) {
    return this.configVersionService.createVersion(tenantId, nodeId, {
      changedBy: userId,
      changeReason: reason || 'Manual snapshot',
      changeType: 'update',
    });
  }

  /**
   * Rollback to a specific version
   */
  @Post('rollback')
  async rollback(
    @TenantId() tenantId: string,
    @Body() dto: RollbackConfigDto,
  ) {
    return this.configVersionService.rollbackToVersion(tenantId, dto.versionId, dto.reason);
  }
}
