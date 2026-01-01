import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { NodeSelectorService } from '../../../modules/node-group/node-selector.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface GenerateSocks5Dto {
  nodeId?: string;
  nodeGroupId?: string;
  count: number;
  port?: number;
  portStrategy?: 'single_port' | 'multi_ip_random';
  portRange?: { min: number; max: number };
  customUid?: string;
  egressIpId?: string;
  expiresAt?: string;
}

export interface Socks5Entry {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  egressIp?: string;
}

@Injectable()
export class Socks5GenerateService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private nodeSelector: NodeSelectorService,
  ) {}

  private generatePassword(): string {
    return randomBytes(12).toString('base64url');
  }

  private generateUsername(index: number): string {
    return `gs${Date.now().toString(36)}${index}@gosea`;
  }

  async generate(tenantId: string, dto: GenerateSocks5Dto): Promise<{ entries: Socks5Entry[] }> {
    const { nodeId, nodeGroupId, count, port = 1080, portStrategy: _portStrategy = 'single_port', customUid, egressIpId } = dto;

    // 1. Resolve node - either by nodeId or from nodeGroupId (residential_socks5 type)
    let node;
    if (nodeId) {
      node = await this.prisma.node.findFirst({
        where: { id: nodeId, tenantId, status: 'online' },
        include: { egressIps: { where: { isActive: true } } },
      });
    } else if (nodeGroupId) {
      // Use NodeSelectorService for load-balanced node selection
      const group = await this.prisma.nodeGroup.findFirst({
        where: { id: nodeGroupId, tenantId },
      });
      if (!group) throw new NotFoundException('Node group not found');
      
      const selectedNode = await this.nodeSelector.selectNode(nodeGroupId, 'socks5');
      if (!selectedNode) throw new NotFoundException('No available nodes in group');
      
      node = await this.prisma.node.findFirst({
        where: { id: selectedNode.id },
        include: { egressIps: { where: { isActive: true } } },
      });
    } else {
      throw new BadRequestException('Either nodeId or nodeGroupId is required');
    }
    
    if (!node) throw new NotFoundException('Node not found or offline');

    // 2. Check customUid allocation (avoid same user getting same egress IP)
    if (customUid && egressIpId) {
      // Find outbound with this egressIpId
      const outboundWithEgress = await this.prisma.outbound.findFirst({
        where: { nodeId: node.id, egressIpId },
      });
      if (outboundWithEgress) {
        const existing = await this.prisma.client.findFirst({
          where: {
            tenantId,
            email: { startsWith: `gs`, endsWith: '@gosea' },
            metadata: { path: ['customUid'], equals: customUid },
            outboundTag: outboundWithEgress.tag,
          },
        });
        if (existing) {
          throw new BadRequestException(`CustomUid ${customUid} already allocated to this egress IP`);
        }
      }
    }

    // 3. Determine egress IP
    let selectedEgressIp = node.egressIps[0];
    if (egressIpId) {
      const found = node.egressIps.find(ip => ip.id === egressIpId);
      if (!found) throw new BadRequestException('Specified egress IP not found on this node');
      selectedEgressIp = found;
    }

    const entries: Socks5Entry[] = [];
    const inboundTag = `gosea-socks5-${port}`;

    // 4. Create or get shared Socks5 Inbound
    let inbound = await this.prisma.inbound.findFirst({
      where: { nodeId: node.id, tag: inboundTag },
    });

    if (!inbound) {
      inbound = await this.prisma.inbound.create({
        data: {
          tenantId,
          nodeId: node.id,
          tag: inboundTag,
          protocol: 'socks',
          port,
          listen: '0.0.0.0',
          settings: JSON.stringify({ auth: 'password', accounts: [], udp: true }),
          enable: true,
          remark: 'GoSea Socks5 Inbound',
        },
      });
    }

    // 5. Create Outbound for egress IP (if not exists)
    const outboundTag = `gosea-direct-${selectedEgressIp?.ip?.replace(/\./g, '-') || 'default'}`;
    let outbound = await this.prisma.outbound.findFirst({
      where: { nodeId: node.id, tag: outboundTag },
    });

    if (!outbound) {
      outbound = await this.prisma.outbound.create({
        data: {
          tenantId,
          nodeId: node.id,
          tag: outboundTag,
          protocol: 'freedom',
          sendThrough: selectedEgressIp?.ip,
          egressIpId: selectedEgressIp?.id,
          settings: '{}',
          enable: true,
          remark: `GoSea Direct via ${selectedEgressIp?.ip || 'default'}`,
        },
      });
    }

    // 6. Create clients and routing rules
    for (let i = 0; i < count; i++) {
      const username = this.generateUsername(i);
      const password = this.generatePassword();

      // Create client
      const client = await this.prisma.client.create({
        data: {
          tenantId,
          email: username,
          uuid: uuidv4(),
          password,
          level: 0,
          outboundTag: outbound.tag,
          inboundTags: [inbound.tag],
          enable: true,
          metadata: { customUid, source: 'gosea', generatedAt: new Date().toISOString() },
          expiryTime: dto.expiresAt ? BigInt(new Date(dto.expiresAt).getTime()) : BigInt(0),
        },
      });

      // Create routing rule (user -> outbound)
      await this.prisma.routingRule.create({
        data: {
          tenantId,
          nodeId: node.id,
          ruleTag: `gosea-route-${client.id.slice(0, 8)}`,
          priority: 100,
          ruleConfig: JSON.stringify({
            type: 'field',
            user: [username],
            outboundTag: outbound.tag,
          }),
          enable: true,
        },
      });

      entries.push({
        id: client.id,
        host: node.publicIp || 'unknown',
        port,
        username,
        password,
        egressIp: selectedEgressIp?.ip,
      });
    }

    // 7. Invalidate node cache
    await this.redis.invalidateNodeCache(node.id);

    return { entries };
  }

  async list(tenantId: string, nodeId?: string) {
    // Get clients with gosea metadata
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        email: { endsWith: '@gosea' },
        metadata: { path: ['source'], equals: 'gosea' },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get inbounds for these clients
    const allInboundTags = clients.flatMap(c => c.inboundTags);
    const inbounds = await this.prisma.inbound.findMany({
      where: { 
        tag: { in: allInboundTags },
        ...(nodeId && { nodeId }),
      },
      include: { node: { select: { publicIp: true } } },
    });
    const inboundMap = new Map(inbounds.map(i => [i.tag, i]));

    // Get outbounds for these clients
    const outboundTags = clients.map(c => c.outboundTag).filter(Boolean) as string[];
    const outbounds = await this.prisma.outbound.findMany({
      where: { tag: { in: outboundTags } },
    });
    const outboundMap = new Map(outbounds.map(o => [o.tag, o]));

    return clients.map(c => {
      const inbound = c.inboundTags[0] ? inboundMap.get(c.inboundTags[0]) : undefined;
      const outbound = c.outboundTag ? outboundMap.get(c.outboundTag) : undefined;
      return {
        id: c.id,
        host: inbound?.node?.publicIp || 'unknown',
        port: inbound?.port || 0,
        username: c.email,
        password: c.password || '',
        egressIp: outbound?.sendThrough,
        customUid: (c.metadata as Record<string, unknown>)?.customUid,
        createdAt: c.createdAt,
      };
    });
  }

  async delete(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, email: { endsWith: '@gosea' } },
    });
    if (!client) throw new NotFoundException('Socks5 entry not found');

    // Get nodeId from first inbound tag
    const inbound = client.inboundTags[0]
      ? await this.prisma.inbound.findFirst({ where: { tag: client.inboundTags[0] } })
      : null;
    const nodeId = inbound?.nodeId;

    // Delete routing rule
    await this.prisma.routingRule.deleteMany({
      where: { tenantId, ruleTag: { startsWith: `gosea-route-${id.slice(0, 8)}` } },
    });

    // Delete client
    await this.prisma.client.delete({ where: { id } });

    // Invalidate cache
    if (nodeId) await this.redis.invalidateNodeCache(nodeId);

    return { success: true };
  }
}
