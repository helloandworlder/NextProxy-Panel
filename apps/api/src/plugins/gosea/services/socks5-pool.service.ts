import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddToPoolDto, AllocateSocks5Dto, ReleaseSocks5Dto } from '../dto/gosea.dto';

@Injectable()
export class Socks5PoolService {
  constructor(private prisma: PrismaService) {}

  async addToPool(tenantId: string, dto: AddToPoolDto) {
    const results = await this.prisma.$transaction(
      dto.proxies.map((proxy) =>
        this.prisma.goSeaSocks5Pool.create({
          data: {
            tenantId,
            ip: proxy.ip,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
            countryCode: proxy.countryCode,
            cityCode: proxy.cityCode,
            ispType: proxy.ispType,
            maxAllocations: proxy.maxAllocations || 1,
            expiresAt: proxy.expiresAt ? new Date(proxy.expiresAt) : null,
            source: proxy.source,
            sourceProxyId: proxy.sourceProxyId,
          },
        }),
      ),
    );
    return { added: results.length, proxies: results };
  }

  async allocate(tenantId: string, dto: AllocateSocks5Dto) {
    const { countryCode, cityCode, quantity, days, externalOrderId, externalUserId } = dto;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Find available proxies (not exhausted, not expired)
    const available = await this.prisma.goSeaSocks5Pool.findMany({
      where: {
        tenantId,
        countryCode,
        ...(cityCode && { cityCode }),
        status: { in: ['available', 'allocated'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { currentAllocations: 'asc' },
    });

    // Filter by oversell capacity
    const allocatable = available.filter((p) => p.currentAllocations < p.maxAllocations);
    if (allocatable.length < quantity) {
      throw new BadRequestException(`Insufficient inventory. Available: ${allocatable.length}, Requested: ${quantity}`);
    }

    // Allocate
    const allocations: Array<{
      id: string;
      pool: { ip: string; port: number; username: string; password: string; countryCode: string; cityCode: string | null };
      expiresAt: Date;
    }> = [];
    for (let i = 0; i < quantity; i++) {
      const pool = allocatable[i % allocatable.length];
      const allocation = await this.prisma.$transaction(async (tx) => {
        await tx.goSeaSocks5Pool.update({
          where: { id: pool.id },
          data: {
            currentAllocations: { increment: 1 },
            status: pool.currentAllocations + 1 >= pool.maxAllocations ? 'exhausted' : 'allocated',
          },
        });
        return tx.goSeaSocks5Allocation.create({
          data: { tenantId, poolId: pool.id, externalOrderId, externalUserId, expiresAt },
          include: { pool: true },
        });
      });
      allocations.push(allocation);
    }

    return {
      success: true,
      allocations: allocations.map((a) => ({
        allocationId: a.id,
        ip: a.pool.ip,
        port: a.pool.port,
        username: a.pool.username,
        password: a.pool.password,
        countryCode: a.pool.countryCode,
        cityCode: a.pool.cityCode,
        expiresAt: a.expiresAt.toISOString(),
      })),
    };
  }

  async release(tenantId: string, dto: ReleaseSocks5Dto) {
    let released = 0;
    for (const id of dto.allocationIds) {
      const allocation = await this.prisma.goSeaSocks5Allocation.findFirst({
        where: { id, tenantId, status: 'active' },
      });
      if (!allocation) continue;

      await this.prisma.$transaction([
        this.prisma.goSeaSocks5Allocation.update({ where: { id }, data: { status: 'released' } }),
        this.prisma.goSeaSocks5Pool.update({
          where: { id: allocation.poolId },
          data: { currentAllocations: { decrement: 1 }, status: 'available' },
        }),
      ]);
      released++;
    }
    return { released };
  }

  async getInventory(tenantId: string) {
    const pools = await this.prisma.goSeaSocks5Pool.groupBy({
      by: ['countryCode', 'cityCode'],
      where: { tenantId, status: { in: ['available', 'allocated'] } },
      _sum: { maxAllocations: true, currentAllocations: true },
      _count: true,
    });
    return pools.map((p) => ({
      countryCode: p.countryCode,
      cityCode: p.cityCode,
      totalProxies: p._count,
      totalCapacity: p._sum.maxAllocations || 0,
      allocated: p._sum.currentAllocations || 0,
      available: (p._sum.maxAllocations || 0) - (p._sum.currentAllocations || 0),
    }));
  }

  async getAllocations(tenantId: string, filters?: { status?: string; externalOrderId?: string }) {
    return this.prisma.goSeaSocks5Allocation.findMany({
      where: { tenantId, ...(filters?.status && { status: filters.status }), ...(filters?.externalOrderId && { externalOrderId: filters.externalOrderId }) },
      include: { pool: { select: { ip: true, port: true, username: true, password: true, countryCode: true, cityCode: true } } },
      orderBy: { allocatedAt: 'desc' },
    });
  }

  async getPoolList(tenantId: string, filters?: { status?: string; countryCode?: string }) {
    return this.prisma.goSeaSocks5Pool.findMany({
      where: { tenantId, ...(filters?.status && { status: filters.status }), ...(filters?.countryCode && { countryCode: filters.countryCode }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteFromPool(tenantId: string, poolId: string) {
    const pool = await this.prisma.goSeaSocks5Pool.findFirst({ where: { id: poolId, tenantId } });
    if (!pool) throw new NotFoundException('Pool entry not found');
    if (pool.currentAllocations > 0) throw new BadRequestException('Cannot delete pool with active allocations');
    return this.prisma.goSeaSocks5Pool.delete({ where: { id: poolId } });
  }
}
