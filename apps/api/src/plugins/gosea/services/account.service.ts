import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Get Account Info (ipipdcn style)
  // ============================================

  async getAccountInfo(tenantId: string, userId: string) {
    // Get tenant info
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    // Get user info
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Get instance counts
    const [totalInstances, activeInstances, expiredInstances] = await Promise.all([
      this.prisma.goSeaSocks5Pool.count({ where: { tenantId } }),
      this.prisma.goSeaSocks5Pool.count({ where: { tenantId, status: 'active' } }),
      this.prisma.goSeaSocks5Pool.count({ where: { tenantId, status: 'expired' } }),
    ]);

    // Get order counts
    const [totalOrders, completedOrders] = await Promise.all([
      this.prisma.goSeaOrder.count({ where: { tenantId } }),
      this.prisma.goSeaOrder.count({ where: { tenantId, status: 'completed' } }),
    ]);

    // Get relay counts (use Client as proxy for relay count since GoSeaRelay may not exist)
    const totalRelays = await this.prisma.client.count({ where: { tenantId } });

    return {
      success: true,
      code: 'SUCCESS',
      data: {
        userId: user?.id || userId,
        username: user?.username || 'unknown',
        email: user?.email || '',
        phone: '',
        status: 'active',
        registeredAt: user?.createdAt?.toISOString(),
        lastLoginAt: user?.updatedAt?.toISOString(),
        currency: 'USD',
        balance: 0, // Would come from billing system
        // Extended info
        tenantId,
        tenantName: tenant?.name || 'Default',
        statistics: {
          totalInstances,
          activeInstances,
          expiredInstances,
          totalOrders,
          completedOrders,
          totalRelays,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
