import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBalancerDto, UpdateBalancerDto } from './dto/balancer.dto';

@Injectable()
export class BalancerService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateBalancerDto) {
    return this.prisma.balancer.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        tag: dto.tag,
        balancerConfig: JSON.stringify(dto.balancerConfig || {
          selector: [],
          strategy: { type: 'random' },
        }),
        enable: dto.enable ?? true,
        remark: dto.remark,
      },
    });
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.balancer.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      include: { node: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const balancer = await this.prisma.balancer.findFirst({
      where: { id, tenantId },
      include: { node: true },
    });
    if (!balancer) throw new NotFoundException('Balancer not found');
    return balancer;
  }

  async update(tenantId: string, id: string, dto: UpdateBalancerDto) {
    await this.findOne(tenantId, id);
    return this.prisma.balancer.update({
      where: { id },
      data: {
        tag: dto.tag,
        balancerConfig: dto.balancerConfig ? JSON.stringify(dto.balancerConfig) : undefined,
        enable: dto.enable,
        remark: dto.remark,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.balancer.delete({ where: { id } });
  }
}
