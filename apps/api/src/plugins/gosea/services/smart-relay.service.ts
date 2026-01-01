import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface SmartCreateRelayDto {
  socks5Username?: string;
  socks5Password?: string;
  allocationId?: string;
  protocol?: 'vless' | 'vmess' | 'shadowsocks' | 'trojan';
  preferredRegion?: string;
  externalUserId?: string;
}

interface SwitchProtocolDto {
  protocol: 'vless' | 'vmess' | 'shadowsocks' | 'trojan';
}

@Injectable()
export class SmartRelayService {
  constructor(private prisma: PrismaService) {}

  async smartCreate(tenantId: string, dto: SmartCreateRelayDto) {
    let targetSocks5: { ip: string; port: number; username: string; password: string };
    let allocationId: string | undefined;
    let countryCode: string | undefined;

    // Resolve target socks5
    if (dto.allocationId) {
      const allocation = await this.prisma.goSeaSocks5Allocation.findFirst({
        where: { id: dto.allocationId, tenantId, status: 'active' },
        include: { pool: true },
      });
      if (!allocation) throw new NotFoundException('Allocation not found');
      targetSocks5 = { ip: allocation.pool.ip, port: allocation.pool.port, username: allocation.pool.username, password: allocation.pool.password };
      allocationId = allocation.id;
      countryCode = allocation.pool.countryCode;
    } else if (dto.socks5Username && dto.socks5Password) {
      // Find by credentials
      const pool = await this.prisma.goSeaSocks5Pool.findFirst({
        where: { tenantId, username: dto.socks5Username, password: dto.socks5Password },
      });
      if (!pool) throw new NotFoundException('Socks5 proxy not found with given credentials');
      targetSocks5 = { ip: pool.ip, port: pool.port, username: pool.username, password: pool.password };
      countryCode = pool.countryCode;
    } else {
      throw new BadRequestException('Either allocationId or socks5Username+socks5Password required');
    }

    // Smart node selection
    const relayNode = await this.selectOptimalNode(tenantId, countryCode, dto.preferredRegion);
    if (!relayNode) throw new BadRequestException('No available relay node');

    const protocol = dto.protocol || 'vless';
    const uuid = randomUUID();
    const inboundPort = await this.getOrCreateSharedPort(relayNode.id, protocol);

    // Create relay
    const relay = await this.prisma.goSeaRelayEndpoint.create({
      data: {
        tenantId, nodeId: relayNode.id, allocationId, protocol, uuid, inboundPort,
        targetSocks5: targetSocks5 as any, externalUserId: dto.externalUserId,
      },
    });

    const host = relayNode.publicIp || '';
    return {
      relayId: relay.id, protocol, uuid, host, port: inboundPort,
      link: this.generateLink(protocol, uuid, host, inboundPort, relayNode.countryCode || 'Relay'),
      node: { id: relayNode.id, name: relayNode.name, countryCode: relayNode.countryCode },
    };
  }

  async switchProtocol(tenantId: string, relayId: string, dto: SwitchProtocolDto) {
    const relay = await this.prisma.goSeaRelayEndpoint.findFirst({
      where: { id: relayId, tenantId },
      include: { node: true },
    });
    if (!relay) throw new NotFoundException('Relay not found');

    const newPort = await this.getOrCreateSharedPort(relay.nodeId, dto.protocol);
    const updated = await this.prisma.goSeaRelayEndpoint.update({
      where: { id: relayId },
      data: { protocol: dto.protocol, inboundPort: newPort },
    });

    const host = relay.node.publicIp || '';
    return {
      relayId: updated.id, protocol: dto.protocol, uuid: updated.uuid, host, port: newPort,
      link: this.generateLink(dto.protocol, updated.uuid, host, newPort, relay.node.countryCode || 'Relay'),
    };
  }

  async getRelayLink(tenantId: string, relayId: string) {
    const relay = await this.prisma.goSeaRelayEndpoint.findFirst({
      where: { id: relayId, tenantId },
      include: { node: true },
    });
    if (!relay) throw new NotFoundException('Relay not found');

    const host = relay.node.publicIp || '';
    return {
      relayId: relay.id, protocol: relay.protocol, uuid: relay.uuid, host, port: relay.inboundPort,
      link: this.generateLink(relay.protocol, relay.uuid, host, relay.inboundPort, relay.node.countryCode || 'Relay'),
    };
  }

  private async selectOptimalNode(tenantId: string, targetCountry?: string, preferredRegion?: string) {
    // Priority: 1. Same region, 2. Preferred region, 3. Any online relay node
    const conditions = [
      { tenantId, nodeType: { in: ['relay', 'transit', 'edge'] }, status: 'online', ...(targetCountry && { countryCode: targetCountry }) },
      { tenantId, nodeType: { in: ['relay', 'transit', 'edge'] }, status: 'online', ...(preferredRegion && { countryCode: preferredRegion }) },
      { tenantId, nodeType: { in: ['relay', 'transit', 'edge'] }, status: 'online' },
    ];

    for (const where of conditions) {
      const node = await this.prisma.node.findFirst({ where, orderBy: { createdAt: 'asc' } });
      if (node) return node;
    }
    return null;
  }

  private async getOrCreateSharedPort(nodeId: string, protocol: string): Promise<number> {
    const existing = await this.prisma.goSeaRelayEndpoint.findFirst({
      where: { nodeId, protocol }, select: { inboundPort: true },
    });
    if (existing) return existing.inboundPort;
    return protocol === 'shadowsocks' ? 8388 : 443;
  }

  private generateLink(protocol: string, uuid: string, host: string, port: number, remark: string): string {
    const name = encodeURIComponent(`GoSea-${remark}`);
    switch (protocol) {
      case 'vless': return `vless://${uuid}@${host}:${port}?encryption=none&type=tcp#${name}`;
      case 'vmess': {
        const vmess = { v: '2', ps: `GoSea-${remark}`, add: host, port, id: uuid, aid: 0, scy: 'auto', net: 'tcp', tls: '' };
        return `vmess://${Buffer.from(JSON.stringify(vmess)).toString('base64')}`;
      }
      case 'shadowsocks': return `ss://${Buffer.from(`aes-256-gcm:${uuid}`).toString('base64')}@${host}:${port}#${name}`;
      case 'trojan': return `trojan://${uuid}@${host}:${port}?type=tcp#${name}`;
      default: return '';
    }
  }
}
