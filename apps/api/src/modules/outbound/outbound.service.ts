import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateOutboundDto, UpdateOutboundDto } from './dto/outbound.dto';
import { OutboundValidator } from '../../common/validators/outbound.validator';

@Injectable()
export class OutboundService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private outboundValidator: OutboundValidator,
  ) {}

  async create(tenantId: string, dto: CreateOutboundDto) {
    // Validate configuration before creating
    const validation = await this.outboundValidator.validate({
      nodeId: dto.nodeId,
      tag: dto.tag,
      protocol: dto.protocol,
      sendThrough: dto.sendThrough,
      settings: dto.settings,
      streamSettings: dto.streamSettings,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid outbound configuration',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const outbound = await this.prisma.outbound.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        tag: dto.tag,
        protocol: dto.protocol,
        sendThrough: dto.sendThrough,
        egressIpId: dto.egressIpId,
        settings: JSON.stringify(dto.settings || {}),
        streamSettings: dto.streamSettings ? JSON.stringify(dto.streamSettings) : '{}',
        proxySettings: dto.proxySettings ? JSON.stringify(dto.proxySettings) : '{}',
        muxSettings: dto.muxSettings ? JSON.stringify(dto.muxSettings) : '{}',
        priority: dto.priority || 100,
        enable: dto.enable ?? true,
        remark: dto.remark,
        sortOrder: dto.sortOrder || 0,
      },
    });
    await this.redis.invalidateNodeCache(dto.nodeId);
    return outbound;
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.outbound.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      include: { egressIp: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const outbound = await this.prisma.outbound.findFirst({
      where: { id, tenantId },
      include: { egressIp: true },
    });
    if (!outbound) throw new NotFoundException('Outbound not found');
    return outbound;
  }

  async update(tenantId: string, id: string, dto: UpdateOutboundDto) {
    const existing = await this.findOne(tenantId, id);

    // Validate configuration before updating
    const validation = await this.outboundValidator.validate({
      nodeId: existing.nodeId,
      tag: dto.tag ?? existing.tag,
      protocol: dto.protocol ?? existing.protocol,
      sendThrough: dto.sendThrough ?? existing.sendThrough ?? undefined,
      settings: dto.settings ?? JSON.parse(existing.settings || '{}'),
      streamSettings: dto.streamSettings ?? JSON.parse(existing.streamSettings || '{}'),
    }, id);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid outbound configuration',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const outbound = await this.prisma.outbound.update({
      where: { id },
      data: {
        tag: dto.tag,
        protocol: dto.protocol,
        sendThrough: dto.sendThrough,
        egressIpId: dto.egressIpId,
        settings: dto.settings ? JSON.stringify(dto.settings) : undefined,
        streamSettings: dto.streamSettings ? JSON.stringify(dto.streamSettings) : undefined,
        proxySettings: dto.proxySettings ? JSON.stringify(dto.proxySettings) : undefined,
        muxSettings: dto.muxSettings ? JSON.stringify(dto.muxSettings) : undefined,
        priority: dto.priority,
        enable: dto.enable,
        remark: dto.remark,
        sortOrder: dto.sortOrder,
      },
    });
    await this.redis.invalidateNodeCache(existing.nodeId);
    return outbound;
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    const result = await this.prisma.outbound.delete({ where: { id } });
    await this.redis.invalidateNodeCache(existing.nodeId);
    return result;
  }
}
