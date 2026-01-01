import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SearchInstancesDto, BatchChangeIpDto, BatchRenewDto, BatchUpdateCredentialsDto } from '../dto/instance.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InstanceService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Search Instances
  // ============================================

  async searchInstances(tenantId: string, dto: SearchInstancesDto) {
    const { status, proxyIds, countryCode, cityCode, ispType, orderNo, ip, expiringSoon, current = 0, size = 20 } = dto;

    const where: any = { tenantId };

    // Status mapping: 0=creating, 1=active, 2=expired, 3=disabled
    if (status !== undefined) {
      const statusMap: Record<number, string> = { 0: 'creating', 1: 'active', 2: 'expired', 3: 'disabled' };
      where.status = statusMap[status] || 'active';
    }

    if (proxyIds?.length) where.id = { in: proxyIds };
    if (countryCode) where.countryCode = countryCode;
    if (cityCode) where.cityCode = cityCode;
    if (ispType !== undefined) where.ispType = ispType;
    if (orderNo) where.orderId = orderNo;
    if (ip) where.ip = { contains: ip };

    // Expiring soon: within 7 days
    if (expiringSoon) {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      where.expiresAt = { lte: sevenDaysLater, gte: new Date() };
    }

    const [records, total] = await Promise.all([
      this.prisma.goSeaSocks5Pool.findMany({
        where,
        skip: current * size,
        take: size,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.goSeaSocks5Pool.count({ where }),
    ]);

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        records: records.map(r => this.mapInstance(r)),
        current,
        size,
        total,
        offset: current * size,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // Batch Change IP
  // ============================================

  async batchChangeIp(tenantId: string, dto: BatchChangeIpDto) {
    const { proxyIds, remark } = dto;

    const instances = await this.prisma.goSeaSocks5Pool.findMany({
      where: { tenantId, id: { in: proxyIds } },
    });

    const foundIds = new Set(instances.map(i => i.id));
    const successList: any[] = [];
    const failedList: any[] = [];

    for (const proxyId of proxyIds) {
      if (!foundIds.has(proxyId)) {
        failedList.push({ proxyId, reason: 'Instance not found' });
        continue;
      }

      // In real implementation, this would call upstream provider to change IP
      // For now, we simulate by generating a new IP
      const newIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      await this.prisma.goSeaSocks5Pool.update({
        where: { id: proxyId },
        data: { ip: newIp, updatedAt: new Date() },
      });

      successList.push({ proxyId, newIp });
    }

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        successCount: successList.length,
        failureCount: failedList.length,
        totalCount: proxyIds.length,
        successList,
        failedList,
        remark,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // Batch Renew
  // ============================================

  async batchRenew(tenantId: string, dto: BatchRenewDto) {
    const { proxyIds, days, currency, remark, orderNo } = dto;

    const instances = await this.prisma.goSeaSocks5Pool.findMany({
      where: { tenantId, id: { in: proxyIds } },
    });

    const _foundIds = new Set(instances.map(i => i.id));
    const successList: any[] = [];
    const failedList: any[] = [];
    let totalCost = 0;

    for (const proxyId of proxyIds) {
      const instance = instances.find(i => i.id === proxyId);
      if (!instance) {
        failedList.push({ proxyId, reason: 'Instance not found' });
        continue;
      }

      // Calculate new expiry date
      const currentExpiry = instance.expiresAt || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + days);

      // Calculate cost (simplified: $0.1 per day per instance)
      const cost = days * 0.1;
      totalCost += cost;

      await this.prisma.goSeaSocks5Pool.update({
        where: { id: proxyId },
        data: { expiresAt: newExpiry, status: 'active', updatedAt: new Date() },
      });

      successList.push({
        proxyId,
        previousExpiry: currentExpiry.toISOString(),
        newExpiry: newExpiry.toISOString(),
        cost,
      });
    }

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        orderNo: orderNo || `RN${Date.now()}`,
        externalOrderNo: orderNo,
        successCount: successList.length,
        failureCount: failedList.length,
        totalCost,
        currency: currency || 'USD',
        renewalDays: days,
        successList,
        failedList,
        remark,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // Batch Update Credentials
  // ============================================

  async batchUpdateCredentials(tenantId: string, dto: BatchUpdateCredentialsDto) {
    const { proxyIds, username, password, random, remark } = dto;

    const instances = await this.prisma.goSeaSocks5Pool.findMany({
      where: { tenantId, id: { in: proxyIds } },
    });

    const foundIds = new Set(instances.map(i => i.id));
    const successList: any[] = [];
    const failedList: any[] = [];

    for (const proxyId of proxyIds) {
      if (!foundIds.has(proxyId)) {
        failedList.push({ proxyId, reason: 'Instance not found' });
        continue;
      }

      let newUsername = username;
      let newPassword = password;

      if (random) {
        newUsername = `u${randomBytes(6).toString('hex')}`;
        newPassword = randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
      }

      if (!newUsername && !newPassword) {
        failedList.push({ proxyId, reason: 'No credentials provided' });
        continue;
      }

      const updateData: any = { updatedAt: new Date() };
      if (newUsername) updateData.username = newUsername;
      if (newPassword) updateData.password = newPassword;

      await this.prisma.goSeaSocks5Pool.update({ where: { id: proxyId }, data: updateData });

      successList.push({ proxyId, username: newUsername, password: newPassword ? '********' : undefined });
    }

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        successCount: successList.length,
        failureCount: failedList.length,
        totalCount: proxyIds.length,
        successList,
        failedList,
        remark,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // Helper: Map Instance to unified format
  // ============================================

  private mapInstance(r: any) {
    const statusMap: Record<string, number> = { creating: 0, active: 1, expired: 2, disabled: 3 };
    return {
      proxyId: r.id,
      host: r.ip,        // Unified field name
      ip: r.ip,          // Keep for backward compatibility
      port: r.port,
      username: r.username,
      password: '********', // Masked
      protocol: 'socks5',  // Protocol type
      status: statusMap[r.status] ?? 1,
      ispType: r.ispType || 0,
      countryCode: r.countryCode,
      countryName: r.countryName,
      cityCode: r.cityCode,
      cityName: r.cityName,
      autoRenew: r.autoRenew || false,
      createdAt: r.createdAt?.getTime()?.toString(),
      activatedAt: r.activatedAt?.getTime()?.toString(),
      expiresAt: r.expiresAt?.getTime()?.toString(),
    };
  }
}
