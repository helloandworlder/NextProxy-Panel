import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRelayDto, UpdateRelayDto } from '../dto/gosea.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class RelayService {
  constructor(private prisma: PrismaService) {}

  async createRelay(tenantId: string, dto: CreateRelayDto) {
    // Determine target socks5 from allocation or direct input
    let targetSocks5: { ip: string; port: number; username: string; password: string };

    if (dto.allocationId) {
      const allocation = await this.prisma.goSeaSocks5Allocation.findFirst({
        where: { id: dto.allocationId, tenantId, status: 'active' },
        include: { pool: true },
      });
      if (!allocation) throw new NotFoundException('Allocation not found or inactive');
      targetSocks5 = { ip: allocation.pool.ip, port: allocation.pool.port, username: allocation.pool.username, password: allocation.pool.password };
    } else if (dto.targetSocks5) {
      targetSocks5 = dto.targetSocks5;
    } else {
      throw new BadRequestException('Either allocationId or targetSocks5 must be provided');
    }

    // Find a relay node (transit node with available capacity)
    const relayNode = await this.findRelayNode(tenantId, dto.preferredRegion);
    if (!relayNode) throw new BadRequestException('No available relay node');

    // Generate unique UUID for routing
    const uuid = randomUUID();
    const protocol = dto.protocol || 'vless';

    // Create relay endpoint
    const relay = await this.prisma.goSeaRelayEndpoint.create({
      data: {
        tenantId,
        nodeId: relayNode.id,
        allocationId: dto.allocationId,
        externalOrderId: dto.externalOrderId,
        externalUserId: dto.externalUserId,
        protocol,
        uuid,
        targetSocks5: targetSocks5 as any,
        inboundPort: await this.getSharedInboundPort(relayNode.id, protocol),
      },
    });

    // Generate connection info
    const ingressConfig = relayNode.ingressConfig as { ingressIp?: string; ingressPorts?: number[] } | null;
    const connectHost = ingressConfig?.ingressIp || relayNode.publicIp;

    return {
      relayId: relay.id,
      protocol,
      uuid,
      host: connectHost,
      port: relay.inboundPort,
      // For VLESS
      ...(protocol === 'vless' && { vlessUrl: `vless://${uuid}@${connectHost}:${relay.inboundPort}?encryption=none&type=tcp#GoSea-Relay` }),
      // For Shadowsocks
      ...(protocol === 'shadowsocks' && { ssUrl: `ss://${Buffer.from(`aes-256-gcm:${uuid}`).toString('base64')}@${connectHost}:${relay.inboundPort}#GoSea-Relay` }),
    };
  }

  async getRelay(tenantId: string, relayId: string) {
    const relay = await this.prisma.goSeaRelayEndpoint.findFirst({
      where: { id: relayId, tenantId },
      include: { node: { select: { name: true, publicIp: true, ingressConfig: true } } },
    });
    if (!relay) throw new NotFoundException('Relay not found');
    return relay;
  }

  async listRelays(tenantId: string, filters?: { status?: string; externalOrderId?: string }) {
    return this.prisma.goSeaRelayEndpoint.findMany({
      where: { tenantId, ...(filters?.status && { status: filters.status }), ...(filters?.externalOrderId && { externalOrderId: filters.externalOrderId }) },
      include: { node: { select: { name: true, countryCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRelay(tenantId: string, relayId: string, dto: UpdateRelayDto) {
    const relay = await this.getRelay(tenantId, relayId);
    return this.prisma.goSeaRelayEndpoint.update({ where: { id: relay.id }, data: dto as any });
  }

  async deleteRelay(tenantId: string, relayId: string) {
    const relay = await this.getRelay(tenantId, relayId);
    return this.prisma.goSeaRelayEndpoint.delete({ where: { id: relay.id } });
  }

  private async findRelayNode(tenantId: string, preferredRegion?: string) {
    return this.prisma.node.findFirst({
      where: {
        tenantId,
        nodeType: { in: ['relay', 'transit'] },
        status: 'online',
        ...(preferredRegion && { countryCode: preferredRegion }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getSharedInboundPort(nodeId: string, protocol: string): Promise<number> {
    // Check if shared inbound exists for this protocol
    const existing = await this.prisma.goSeaRelayEndpoint.findFirst({
      where: { nodeId, protocol },
      select: { inboundPort: true },
    });
    if (existing) return existing.inboundPort;
    // Default ports: VLESS=443, SS=8388
    return protocol === 'vless' ? 443 : 8388;
  }

  async getRelayConfig(nodeId: string) {
    // Get all active relays for a node (used by agent to configure Xray)
    const relays = await this.prisma.goSeaRelayEndpoint.findMany({
      where: { nodeId, status: 'active' },
    });
    return relays.map((r) => ({
      uuid: r.uuid,
      protocol: r.protocol,
      port: r.inboundPort,
      targetSocks5: r.targetSocks5,
    }));
  }
}
