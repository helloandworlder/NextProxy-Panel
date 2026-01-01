import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePolicyConfigDto, UpdatePolicyConfigDto } from './dto/policy-config.dto';

@Injectable()
export class PolicyConfigService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePolicyConfigDto) {
    return this.prisma.policyConfig.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        policyConfig: JSON.stringify(dto.policyConfig || {
          levels: { '0': { statsUserUplink: true, statsUserDownlink: true } },
          system: { statsInboundUplink: true, statsInboundDownlink: true },
        }),
        enable: dto.enable ?? true,
      },
    });
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.policyConfig.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      include: { node: { select: { id: true, name: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const config = await this.prisma.policyConfig.findFirst({
      where: { id, tenantId },
      include: { node: true },
    });
    if (!config) throw new NotFoundException('Policy config not found');
    return config;
  }

  async update(tenantId: string, id: string, dto: UpdatePolicyConfigDto) {
    await this.findOne(tenantId, id);
    return this.prisma.policyConfig.update({
      where: { id },
      data: { 
        policyConfig: dto.policyConfig ? JSON.stringify(dto.policyConfig) : undefined, 
        enable: dto.enable 
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.policyConfig.delete({ where: { id } });
  }
}
