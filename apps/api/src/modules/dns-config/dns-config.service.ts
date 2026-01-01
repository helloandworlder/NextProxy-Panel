import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDnsConfigDto, UpdateDnsConfigDto } from './dto/dns-config.dto';

@Injectable()
export class DnsConfigService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDnsConfigDto) {
    return this.prisma.dnsConfig.create({
      data: {
        tenantId,
        nodeId: dto.nodeId,
        dnsConfig: JSON.stringify(dto.dnsConfig || {}),
        enable: dto.enable ?? true,
        remark: dto.remark,
      },
    });
  }

  async findAll(tenantId: string, nodeId?: string) {
    return this.prisma.dnsConfig.findMany({
      where: { tenantId, ...(nodeId && { nodeId }) },
      include: { node: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const config = await this.prisma.dnsConfig.findFirst({
      where: { id, tenantId },
      include: { node: true },
    });
    if (!config) throw new NotFoundException('DNS config not found');
    return config;
  }

  async update(tenantId: string, id: string, dto: UpdateDnsConfigDto) {
    await this.findOne(tenantId, id);
    return this.prisma.dnsConfig.update({
      where: { id },
      data: {
        dnsConfig: dto.dnsConfig ? JSON.stringify(dto.dnsConfig) : undefined,
        enable: dto.enable,
        remark: dto.remark,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.dnsConfig.delete({ where: { id } });
  }
}
