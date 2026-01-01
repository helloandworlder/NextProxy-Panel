import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface CreateOrderDto {
  externalOrderNo?: string;
  countryCode: string;
  cityCode?: string;
  quantity: number;
  days: number;
  protocol?: 'vless' | 'vmess' | 'shadowsocks' | 'trojan';
  preferredRegion?: string;
}

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(tenantId: string, dto: CreateOrderDto) {
    const orderNo = `GO${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const protocol = dto.protocol || 'vless';
    const expiresAt = new Date(Date.now() + dto.days * 24 * 60 * 60 * 1000);

    // Find available proxies
    const available = await this.prisma.goSeaSocks5Pool.findMany({
      where: {
        tenantId, countryCode: dto.countryCode,
        ...(dto.cityCode && { cityCode: dto.cityCode }),
        status: { in: ['available', 'allocated'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { currentAllocations: 'asc' },
    });

    const allocatable = available.filter(p => p.currentAllocations < p.maxAllocations);
    if (allocatable.length < dto.quantity) {
      throw new BadRequestException(`Insufficient inventory. Available: ${allocatable.length}, Requested: ${dto.quantity}`);
    }

    // Find relay node
    const relayNode = await this.prisma.node.findFirst({
      where: {
        tenantId, nodeType: { in: ['relay', 'transit', 'edge'] }, status: 'online',
        ...(dto.preferredRegion && { countryCode: dto.preferredRegion }),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!relayNode) throw new BadRequestException('No available relay node');

    // Create order
    const order = await this.prisma.goSeaOrder.create({
      data: {
        tenantId, orderNo, externalOrderNo: dto.externalOrderNo,
        countryCode: dto.countryCode, cityCode: dto.cityCode,
        quantity: dto.quantity, days: dto.days, protocol, status: 'processing',
      },
    });

    // Allocate proxies and create relays
    const results: Array<{ allocationId: string; relayId: string; proxy: any; link: string }> = [];
    
    for (let i = 0; i < dto.quantity; i++) {
      const pool = allocatable[i % allocatable.length];
      const uuid = randomUUID();

      // Create allocation
      const allocation = await this.prisma.$transaction(async (tx) => {
        await tx.goSeaSocks5Pool.update({
          where: { id: pool.id },
          data: {
            currentAllocations: { increment: 1 },
            status: pool.currentAllocations + 1 >= pool.maxAllocations ? 'exhausted' : 'allocated',
          },
        });
        return tx.goSeaSocks5Allocation.create({
          data: { tenantId, poolId: pool.id, orderId: order.id, expiresAt },
        });
      });

      // Create relay
      const relay = await this.prisma.goSeaRelayEndpoint.create({
        data: {
          tenantId, nodeId: relayNode.id, orderId: order.id, allocationId: allocation.id,
          protocol, uuid, inboundPort: this.getDefaultPort(protocol),
          targetSocks5: { ip: pool.ip, port: pool.port, username: pool.username, password: pool.password },
        },
      });

      const link = this.generateLink(protocol, uuid, relayNode.publicIp || '', relay.inboundPort, pool.countryName || pool.countryCode);
      results.push({
        allocationId: allocation.id, relayId: relay.id,
        proxy: { ip: pool.ip, port: pool.port, username: pool.username, password: pool.password, countryCode: pool.countryCode, cityCode: pool.cityCode },
        link,
      });
    }

    // Update order status
    await this.prisma.goSeaOrder.update({
      where: { id: order.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return { orderNo, status: 'completed', quantity: dto.quantity, days: dto.days, protocol, expiresAt, instances: results };
  }

  async getOrder(tenantId: string, orderNo: string) {
    const order = await this.prisma.goSeaOrder.findFirst({
      where: { tenantId, orderNo },
      include: {
        allocations: { include: { pool: true } },
        relays: { include: { node: { select: { name: true, publicIp: true, countryCode: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async listOrders(tenantId: string, filters?: { status?: string; page?: number; size?: number }) {
    const page = filters?.page || 0;
    const size = filters?.size || 20;
    const [orders, total] = await Promise.all([
      this.prisma.goSeaOrder.findMany({
        where: { tenantId, ...(filters?.status && { status: filters.status }) },
        orderBy: { createdAt: 'desc' },
        skip: page * size, take: size,
        include: { _count: { select: { allocations: true, relays: true } } },
      }),
      this.prisma.goSeaOrder.count({ where: { tenantId, ...(filters?.status && { status: filters.status }) } }),
    ]);
    return { records: orders, total, current: page, size };
  }

  private getDefaultPort(protocol: string): number {
    switch (protocol) {
      case 'vless': return 443;
      case 'vmess': return 443;
      case 'shadowsocks': return 8388;
      case 'trojan': return 443;
      default: return 443;
    }
  }

  private generateLink(protocol: string, uuid: string, host: string, port: number, remark: string): string {
    const name = encodeURIComponent(`GoSea-${remark}`);
    switch (protocol) {
      case 'vless':
        return `vless://${uuid}@${host}:${port}?encryption=none&type=tcp#${name}`;
      case 'vmess': {
        const vmess = { v: '2', ps: `GoSea-${remark}`, add: host, port, id: uuid, aid: 0, scy: 'auto', net: 'tcp', tls: '' };
        return `vmess://${Buffer.from(JSON.stringify(vmess)).toString('base64')}`;
      }
      case 'shadowsocks':
        return `ss://${Buffer.from(`aes-256-gcm:${uuid}`).toString('base64')}@${host}:${port}#${name}`;
      case 'trojan':
        return `trojan://${uuid}@${host}:${port}?type=tcp#${name}`;
      default:
        return '';
    }
  }
}
