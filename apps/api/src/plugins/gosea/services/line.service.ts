import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchLinesDto } from '../dto/instance.dto';

// Business types (ipipdcn style)
const BUSINESS_TYPES = [
  { code: 'WEB', name: '网页浏览' },
  { code: 'GAME', name: '游戏加速' },
  { code: 'STREAM', name: '流媒体' },
  { code: 'SOCIAL', name: '社交媒体' },
  { code: 'ECOMMERCE', name: '电商平台' },
  { code: 'SEO', name: 'SEO优化' },
  { code: 'DATA', name: '数据采集' },
  { code: 'GENERAL', name: '通用代理' },
];

@Injectable()
export class LineService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Get Business Types
  // ============================================

  async getBusinessTypes(_tenantId: string) {
    return {
      success: true,
      code: 'SUCCESS',
      data: BUSINESS_TYPES,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // Search Lines (available proxy lines/nodes)
  // ============================================

  async searchLines(tenantId: string, dto: SearchLinesDto) {
    const { countryCode, cityCode, businessType, tag, ispType, lineId, current = 0, size = 20 } = dto;

    // Lines are mapped from Nodes in our system
    const where: any = { tenantId, status: 'online' };

    if (lineId) where.id = lineId;

    const nodes = await this.prisma.node.findMany({
      where,
      skip: current * size,
      take: size,
      include: { nodeGroup: true },
    });

    const _total = await this.prisma.node.count({ where });

    // Get inventory counts per node using raw query for flexibility
    const inventoryCounts = await this.prisma.goSeaSocks5Pool.groupBy({
      by: ['tenantId'],
      where: { tenantId, status: 'available' },
      _count: true,
    });

    const totalAvailable = inventoryCounts[0]?._count || 0;

    const records = nodes.map(node => ({
      lineId: node.id,
      name: node.name,
      countryCode: (node.configOverrides as any)?.countryCode || 'USA',
      cityCode: (node.configOverrides as any)?.cityCode || 'NYC',
      ispType: (node.configOverrides as any)?.ispType || 0,
      businessTypes: BUSINESS_TYPES.map(b => b.code), // All types supported
      tags: (node.configOverrides as any)?.tags || [],
      availableCount: Math.floor(totalAvailable / Math.max(nodes.length, 1)),
      pricePerDay: (node.configOverrides as any)?.pricePerDay || 0.1,
      currency: 'USD',
      status: node.status === 'online' ? 1 : 0,
    }));

    // Filter by criteria (post-query filtering for simplicity)
    const filtered = records.filter(r => {
      if (countryCode && r.countryCode !== countryCode) return false;
      if (cityCode && r.cityCode !== cityCode) return false;
      if (ispType !== undefined && r.ispType !== ispType) return false;
      if (businessType && !r.businessTypes.includes(businessType)) return false;
      if (tag && !r.tags.includes(tag)) return false;
      return true;
    });

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        records: filtered,
        current,
        size,
        total: filtered.length,
        offset: current * size,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
