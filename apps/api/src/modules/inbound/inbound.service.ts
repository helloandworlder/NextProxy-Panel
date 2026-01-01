/**
 * InboundService v3 - Simplified with XrayConfigBuilder
 * Supports both raw JSON passthrough and structured DTO input
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { XrayConfigBuilder, InboundBuildDto } from '../../common/xray';

// ============================================
// DTOs
// ============================================

export interface CreateInboundRawDto {
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen?: string;
  // Raw JSON passthrough (3x-ui style)
  settings?: string;
  streamSettings?: string;
  sniffing?: string;
  enable?: boolean;
  remark?: string;
  sortOrder?: number;
}

export interface CreateInboundStructuredDto {
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen?: string;
  // Structured input (converted by XrayConfigBuilder)
  securityType?: 'none' | 'tls' | 'reality';
  tlsServerName?: string;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  realityDest?: string;
  realityServerNames?: string[];
  realityPrivateKey?: string;
  realityPublicKey?: string;
  realityShortIds?: string[];
  transportType?: 'tcp' | 'ws' | 'grpc' | 'h2';
  wsPath?: string;
  wsHost?: string;
  grpcServiceName?: string;
  h2Path?: string;
  sniffingEnabled?: boolean;
  sniffingDestOverride?: string[];
  sniffingRouteOnly?: boolean;
  protocolSettings?: Record<string, any>;
  enable?: boolean;
  remark?: string;
  sortOrder?: number;
}

export type CreateInboundDto = CreateInboundRawDto | CreateInboundStructuredDto;

export interface UpdateInboundDto {
  port?: number;
  listen?: string;
  settings?: string | Record<string, any>;
  streamSettings?: string | Record<string, any>;
  sniffing?: string | Record<string, any>;
  allocate?: string | Record<string, any>;
  enable?: boolean;
  remark?: string;
  sortOrder?: number;
}

// ============================================
// Service
// ============================================

@Injectable()
export class InboundServiceV3 {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configBuilder: XrayConfigBuilder,
  ) {}

  /**
   * Create inbound - supports both raw JSON and structured input
   */
  async create(tenantId: string, dto: CreateInboundDto) {
    // Determine if raw or structured input
    const isRaw = 'settings' in dto && typeof dto.settings === 'string';

    let settings: string;
    let streamSettings: string;
    let sniffing: string;

    if (isRaw) {
      // Raw JSON passthrough
      const rawDto = dto as CreateInboundRawDto;
      settings = rawDto.settings || '{}';
      streamSettings = rawDto.streamSettings || '{}';
      sniffing = rawDto.sniffing || '{"enabled":true,"destOverride":["http","tls"]}';
    } else {
      // Structured input - use builder
      const structuredDto = dto as CreateInboundStructuredDto;
      const buildDto: InboundBuildDto = {
        tag: structuredDto.tag,
        protocol: structuredDto.protocol,
        port: structuredDto.port,
        listen: structuredDto.listen,
        securityType: structuredDto.securityType,
        tlsServerName: structuredDto.tlsServerName,
        tlsCertPath: structuredDto.tlsCertPath,
        tlsKeyPath: structuredDto.tlsKeyPath,
        realityDest: structuredDto.realityDest,
        realityServerNames: structuredDto.realityServerNames,
        realityPrivateKey: structuredDto.realityPrivateKey,
        realityPublicKey: structuredDto.realityPublicKey,
        realityShortIds: structuredDto.realityShortIds,
        transportType: structuredDto.transportType,
        wsPath: structuredDto.wsPath,
        wsHost: structuredDto.wsHost,
        grpcServiceName: structuredDto.grpcServiceName,
        h2Path: structuredDto.h2Path,
        sniffingEnabled: structuredDto.sniffingEnabled,
        sniffingDestOverride: structuredDto.sniffingDestOverride,
        sniffingRouteOnly: structuredDto.sniffingRouteOnly,
        protocolSettings: structuredDto.protocolSettings,
      };

      const built = this.configBuilder.buildInbound(buildDto);
      settings = built.settings;
      streamSettings = built.streamSettings;
      sniffing = built.sniffing;
    }

    // Validate port uniqueness on node
    const existingPort = await this.prisma.inbound.findFirst({
      where: { nodeId: dto.nodeId, port: dto.port },
    });
    if (existingPort) {
      throw new BadRequestException(`Port ${dto.port} already in use on this node`);
    }

    // Validate tag uniqueness on node
    const existingTag = await this.prisma.inbound.findFirst({
      where: { nodeId: dto.nodeId, tag: dto.tag },
    });
    if (existingTag) {
      throw new BadRequestException(`Tag ${dto.tag} already exists on this node`);
    }

    const inbound = await this.prisma.inbound.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        tag: dto.tag,
        protocol: dto.protocol,
        port: dto.port,
        listen: dto.listen || '0.0.0.0',
        settings,
        streamSettings,
        sniffing,
        enable: dto.enable ?? true,
        remark: dto.remark,
        sortOrder: dto.sortOrder || 0,
      },
    });

    // Invalidate cache
    await this.redis.invalidateNodeCache(dto.nodeId);

    return inbound;
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.inbound.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const inbound = await this.prisma.inbound.findFirst({
      where: { id, tenantId },
    });
    if (!inbound) throw new NotFoundException('Inbound not found');
    return inbound;
  }

  async update(tenantId: string, id: string, dto: UpdateInboundDto) {
    const existing = await this.findOne(tenantId, id);

    // Validate port uniqueness if changing
    if (dto.port && dto.port !== existing.port) {
      const existingPort = await this.prisma.inbound.findFirst({
        where: { nodeId: existing.nodeId, port: dto.port, id: { not: id } },
      });
      if (existingPort) {
        throw new BadRequestException(`Port ${dto.port} already in use`);
      }
    }

    const inbound = await this.prisma.inbound.update({
      where: { id },
      data: {
        port: dto.port,
        listen: dto.listen,
        settings: dto.settings !== undefined 
          ? (typeof dto.settings === 'string' ? dto.settings : JSON.stringify(dto.settings))
          : undefined,
        streamSettings: dto.streamSettings !== undefined
          ? (typeof dto.streamSettings === 'string' ? dto.streamSettings : JSON.stringify(dto.streamSettings))
          : undefined,
        sniffing: dto.sniffing !== undefined
          ? (typeof dto.sniffing === 'string' ? dto.sniffing : JSON.stringify(dto.sniffing))
          : undefined,
        enable: dto.enable,
        remark: dto.remark,
        sortOrder: dto.sortOrder,
      },
    });

    await this.redis.invalidateNodeCache(existing.nodeId);
    return inbound;
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    const result = await this.prisma.inbound.delete({ where: { id } });
    await this.redis.invalidateNodeCache(existing.nodeId);
    return result;
  }

  /**
   * Get inbound with parsed JSON fields (for frontend display)
   */
  async findOneParsed(tenantId: string, id: string) {
    const inbound = await this.findOne(tenantId, id);
    return {
      ...inbound,
      settingsParsed: JSON.parse(inbound.settings || '{}'),
      streamSettingsParsed: JSON.parse(inbound.streamSettings || '{}'),
      sniffingParsed: JSON.parse(inbound.sniffing || '{}'),
    };
  }
}
