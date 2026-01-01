import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: QueryAuditLogDto) {
    const { action, resourceType, resourceId, userId, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getActions(tenantId: string) {
    const actions = await this.prisma.auditLog.findMany({
      where: { tenantId },
      select: { action: true },
      distinct: ['action'],
    });
    return actions.map((a) => a.action);
  }

  async getResourceTypes(tenantId: string) {
    const types = await this.prisma.auditLog.findMany({
      where: { tenantId },
      select: { resourceType: true },
      distinct: ['resourceType'],
    });
    return types.map((t) => t.resourceType).filter(Boolean);
  }
}
