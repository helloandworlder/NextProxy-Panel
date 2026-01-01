/**
 * Config Version Service
 * Manages configuration versioning, rollback, and Agent sync
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { validateXrayConfig } from '../../common/validators/xray-config.validator';
import * as crypto from 'crypto';

export interface ConfigSnapshot {
  inbounds: any[];
  outbounds: any[];
  routing: { rules: any[] };
}

export type ConfigVersionStatus = 'pending' | 'pushing' | 'applied' | 'failed' | 'rollback';

@Injectable()
export class ConfigVersionService {
  constructor(
    @InjectPinoLogger(ConfigVersionService.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Create a new config version snapshot for a node
   */
  async createVersion(
    tenantId: string,
    nodeId: string,
    options?: { changedBy?: string; changeReason?: string; changeType?: string },
  ) {
    // Get current node config
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, tenantId },
      include: {
        inbounds: { where: { enable: true } },
        outbounds: { where: { enable: true } },
        routingRules: { where: { enable: true }, orderBy: { priority: 'asc' } },
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    // Build config snapshot
    const configSnapshot: ConfigSnapshot = {
      inbounds: node.inbounds,
      outbounds: node.outbounds,
      routing: { rules: node.routingRules },
    };

    // Validate config before creating version
    const validation = validateXrayConfig(configSnapshot);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid configuration, cannot create version',
        errors: validation.errors,
      });
    }

    // Generate etag (SHA256 hash)
    const configJson = JSON.stringify(configSnapshot);
    const etag = crypto.createHash('sha256').update(configJson).digest('hex');

    // Check if config has changed
    const lastVersion = await this.prisma.configVersion.findFirst({
      where: { nodeId, status: 'applied' },
      orderBy: { version: 'desc' },
    });

    if (lastVersion && lastVersion.etag === etag) {
      this.logger.debug(`Config unchanged for node ${nodeId}, skipping version creation`);
      return lastVersion;
    }

    // Create new version
    const version = await this.prisma.configVersion.create({
      data: {
        tenantId,
        nodeId,
        configJson: configSnapshot as any,
        etag,
        status: 'pending',
        changeType: options?.changeType || 'update',
        changedBy: options?.changedBy,
        changeReason: options?.changeReason,
      },
    });

    this.logger.info(`Created config version ${version.id} for node ${nodeId}`);
    return version;
  }

  /**
   * Mark version as pushing (being sent to Agent)
   */
  async markPushing(versionId: string) {
    return this.prisma.configVersion.update({
      where: { id: versionId },
      data: { status: 'pushing' },
    });
  }

  /**
   * Mark version as applied (Agent confirmed success)
   */
  async markApplied(versionId: string) {
    return this.prisma.configVersion.update({
      where: { id: versionId },
      data: { status: 'applied', appliedAt: new Date() },
    });
  }

  /**
   * Mark version as failed and trigger rollback
   */
  async markFailed(nodeId: string, versionId: string, errorMsg: string) {
    // Update failed version
    await this.prisma.configVersion.update({
      where: { id: versionId },
      data: { status: 'failed', errorMsg },
    });

    this.logger.error(`Config version ${versionId} failed: ${errorMsg}`);

    // Find last successful version for rollback
    const lastApplied = await this.prisma.configVersion.findFirst({
      where: { nodeId, status: 'applied' },
      orderBy: { version: 'desc' },
    });

    if (lastApplied) {
      this.logger.info(`Triggering rollback to version ${lastApplied.id} for node ${nodeId}`);
      // Trigger rollback event
      await this.redis.publish('config:rollback', {
        nodeId,
        versionId: lastApplied.id,
        reason: `Auto-rollback due to error: ${errorMsg}`,
      });
      return { rollbackTo: lastApplied };
    }

    return { rollbackTo: null };
  }

  /**
   * Get version history for a node
   */
  async getVersionHistory(tenantId: string, nodeId: string, limit = 20) {
    return this.prisma.configVersion.findMany({
      where: { tenantId, nodeId },
      orderBy: { version: 'desc' },
      take: limit,
    });
  }

  /**
   * Get a specific version
   */
  async getVersion(tenantId: string, versionId: string) {
    const version = await this.prisma.configVersion.findFirst({
      where: { id: versionId, tenantId },
    });
    if (!version) throw new NotFoundException('Config version not found');
    return version;
  }

  /**
   * Get current applied version for a node
   */
  async getCurrentVersion(nodeId: string) {
    return this.prisma.configVersion.findFirst({
      where: { nodeId, status: 'applied' },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Manual rollback to a specific version
   */
  async rollbackToVersion(tenantId: string, versionId: string, reason?: string) {
    const targetVersion = await this.getVersion(tenantId, versionId);

    // Create a new rollback version with the old config
    const rollbackVersion = await this.prisma.configVersion.create({
      data: {
        tenantId,
        nodeId: targetVersion.nodeId,
        configJson: targetVersion.configJson as any,
        etag: targetVersion.etag,
        status: 'pending',
        changeType: 'rollback',
        changeReason: reason || `Rollback to version ${targetVersion.version}`,
      },
    });

    // Trigger config push
    await this.redis.publish('config:change', {
      nodeId: targetVersion.nodeId,
      versionId: rollbackVersion.id,
    });

    return rollbackVersion;
  }

  /**
   * Compare two versions
   */
  async compareVersions(tenantId: string, versionId1: string, versionId2: string) {
    const [v1, v2] = await Promise.all([
      this.getVersion(tenantId, versionId1),
      this.getVersion(tenantId, versionId2),
    ]);

    return {
      version1: { id: v1.id, version: v1.version, createdAt: v1.createdAt },
      version2: { id: v2.id, version: v2.version, createdAt: v2.createdAt },
      config1: v1.configJson,
      config2: v2.configJson,
      sameConfig: v1.etag === v2.etag,
    };
  }
}
