import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateRoutingRuleDto, UpdateRoutingRuleDto } from './dto/routing.dto';
import { RoutingValidator } from '../../common/validators/routing.validator';

@Injectable()
export class RoutingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private routingValidator: RoutingValidator,
  ) {}

  async create(tenantId: string, dto: CreateRoutingRuleDto) {
    // Validate routing rule configuration
    const ruleConfig = dto.ruleConfig as Record<string, any> || {};
    const validation = await this.routingValidator.validate({
      nodeId: dto.nodeId,
      rules: [ruleConfig],
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid routing rule configuration',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    const rule = await this.prisma.routingRule.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        ruleTag: dto.ruleTag,
        priority: dto.priority || 100,
        ruleConfig: JSON.stringify(dto.ruleConfig || {}),
        enable: dto.enable ?? true,
        remark: dto.remark,
      },
    });
    await this.redis.invalidateNodeCache(dto.nodeId);
    return rule;
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.routingRule.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      orderBy: { priority: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const rule = await this.prisma.routingRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Routing rule not found');
    return rule;
  }

  async update(tenantId: string, id: string, dto: UpdateRoutingRuleDto) {
    const existing = await this.findOne(tenantId, id);

    // Validate routing rule configuration
    if (dto.ruleConfig) {
      const ruleConfig = dto.ruleConfig as Record<string, any>;
      const validation = await this.routingValidator.validate({
        nodeId: existing.nodeId,
        rules: [ruleConfig],
      });

      if (!validation.valid) {
        throw new BadRequestException({
          message: 'Invalid routing rule configuration',
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }
    }

    const rule = await this.prisma.routingRule.update({
      where: { id },
      data: {
        ruleTag: dto.ruleTag,
        priority: dto.priority,
        ruleConfig: dto.ruleConfig ? JSON.stringify(dto.ruleConfig) : undefined,
        enable: dto.enable,
        remark: dto.remark,
      },
    });
    await this.redis.invalidateNodeCache(existing.nodeId);
    return rule;
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    const result = await this.prisma.routingRule.delete({ where: { id } });
    await this.redis.invalidateNodeCache(existing.nodeId);
    return result;
  }
}
