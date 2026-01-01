import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { NodeSelectorService } from '../../../modules/node-group/node-selector.service';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export interface CreateRelayDto {
  nodeId?: string;
  nodeGroupId?: string;
  protocol: 'vless' | 'vmess' | 'shadowsocks';
  port?: number;
  targetSocks5: {
    ip: string;
    port: number;
    username: string;
    password: string;
  };
  remark?: string;
}

export interface RelayEntry {
  id: string;
  protocol: string;
  host: string;
  port: number;
  uuid: string;
  password?: string;
  method?: string;
  connectUrl: string;
  targetSocks5: { ip: string; port: number };
  remark?: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class RelayGenerateService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private nodeSelector: NodeSelectorService,
  ) {}

  private generatePassword(): string {
    return randomBytes(16).toString('base64url');
  }

  async create(tenantId: string, dto: CreateRelayDto): Promise<RelayEntry> {
    const { nodeId, nodeGroupId, protocol, port = 443, targetSocks5, remark } = dto;

    // 1. Resolve node - either by nodeId or from nodeGroupId (relay type)
    let node;
    if (nodeId) {
      node = await this.prisma.node.findFirst({
        where: { id: nodeId, tenantId },
      });
    } else if (nodeGroupId) {
      // Use NodeSelectorService for load-balanced node selection
      const group = await this.prisma.nodeGroup.findFirst({
        where: { id: nodeGroupId, tenantId },
      });
      if (!group) throw new NotFoundException('Node group not found');
      
      const selectedNode = await this.nodeSelector.selectNode(nodeGroupId, 'relay');
      if (!selectedNode) throw new NotFoundException('No available nodes in group');
      node = selectedNode;
    } else {
      throw new BadRequestException('Either nodeId or nodeGroupId is required');
    }
    
    if (!node) throw new NotFoundException('Node not found');

    const uuid = uuidv4();
    const password = this.generatePassword();
    const inboundTag = `gosea-relay-${protocol}-${port}`;
    const outboundTag = `gosea-socks5-${targetSocks5.ip.replace(/\./g, '-')}-${targetSocks5.port}`;
    const email = `relay-${uuid.slice(0, 8)}@gosea`;

    // 2. Create or get shared Inbound for this protocol/port
    let inbound = await this.prisma.inbound.findFirst({
      where: { nodeId: node.id, tag: inboundTag },
    });

    if (!inbound) {
      const inboundSettings = this.buildInboundSettings(protocol);
      inbound = await this.prisma.inbound.create({
        data: {
          tenantId,
          nodeId: node.id,
          tag: inboundTag,
          protocol: protocol === 'shadowsocks' ? 'shadowsocks' : protocol,
          port,
          listen: '0.0.0.0',
          settings: JSON.stringify(inboundSettings),
          enable: true,
          remark: `GoSea Relay ${protocol.toUpperCase()} Inbound`,
        },
      });
    }

    // 3. Create Socks5 Outbound for target
    let outbound = await this.prisma.outbound.findFirst({
      where: { nodeId: node.id, tag: outboundTag },
    });

    if (!outbound) {
      outbound = await this.prisma.outbound.create({
        data: {
          tenantId,
          nodeId: node.id,
          tag: outboundTag,
          protocol: 'socks',
          settings: JSON.stringify({
            servers: [{
              address: targetSocks5.ip,
              port: targetSocks5.port,
              users: [{ user: targetSocks5.username, pass: targetSocks5.password }],
            }],
          }),
          enable: true,
          remark: `GoSea Socks5 to ${targetSocks5.ip}:${targetSocks5.port}`,
        },
      });
    }

    // 4. Create Client
    const client = await this.prisma.client.create({
      data: {
        tenantId,
        email,
        uuid,
        password: protocol === 'shadowsocks' ? password : undefined,
        method: protocol === 'shadowsocks' ? 'aes-256-gcm' : undefined,
        level: 0,
        outboundTag: outbound.tag,
        inboundTags: [inbound.tag],
        enable: true,
        metadata: { source: 'gosea-relay', protocol, remark },
      },
    });

    // 5. Create Routing Rule
    await this.prisma.routingRule.create({
      data: {
        tenantId,
        nodeId: node.id,
        ruleTag: `gosea-relay-${client.id.slice(0, 8)}`,
        priority: 50,
        ruleConfig: JSON.stringify({
          type: 'field',
          user: [email],
          outboundTag: outbound.tag,
        }),
        enable: true,
      },
    });

    // 6. Invalidate cache
    await this.redis.invalidateNodeCache(node.id);

    // 7. Build connection URL
    const host = node.publicIp || 'unknown';
    const connectUrl = this.buildConnectUrl(protocol, host, port, uuid, password, remark);

    return {
      id: client.id,
      protocol,
      host,
      port,
      uuid,
      password: protocol === 'shadowsocks' ? password : undefined,
      method: protocol === 'shadowsocks' ? 'aes-256-gcm' : undefined,
      connectUrl,
      targetSocks5: { ip: targetSocks5.ip, port: targetSocks5.port },
      remark,
      status: 'active',
      createdAt: client.createdAt,
    };
  }

  private buildInboundSettings(protocol: string): Record<string, unknown> {
    switch (protocol) {
      case 'vless':
        return { decryption: 'none', clients: [] };
      case 'vmess':
        return { clients: [] };
      case 'shadowsocks':
        return { method: 'aes-256-gcm', password: '', network: 'tcp,udp' };
      default:
        return {};
    }
  }

  private buildConnectUrl(protocol: string, host: string, port: number, uuid: string, password: string, remark?: string): string {
    const name = encodeURIComponent(remark || 'GoSea-Relay');
    switch (protocol) {
      case 'vless':
        return `vless://${uuid}@${host}:${port}?encryption=none&type=tcp#${name}`;
      case 'vmess': {
        const vmessConfig = { v: '2', ps: remark || 'GoSea-Relay', add: host, port, id: uuid, aid: 0, net: 'tcp', type: 'none', tls: '' };
        return `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
      }
      case 'shadowsocks': {
        const userinfo = Buffer.from(`aes-256-gcm:${password}`).toString('base64');
        return `ss://${userinfo}@${host}:${port}#${name}`;
      }
      default:
        return '';
    }
  }

  async list(tenantId: string, nodeId?: string): Promise<RelayEntry[]> {
    // Get clients with gosea-relay metadata
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        email: { endsWith: '@gosea' },
        metadata: { path: ['source'], equals: 'gosea-relay' },
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
      const host = inbound?.node?.publicIp || 'unknown';
      const port = inbound?.port || 443;
      const protocol = (c.metadata as Record<string, unknown>)?.protocol as string || 'vless';
      const outbound = c.outboundTag ? outboundMap.get(c.outboundTag) : undefined;
      const outboundSettings = outbound?.settings ? JSON.parse(outbound.settings) : {};
      const target = outboundSettings?.servers?.[0];

      return {
        id: c.id,
        protocol,
        host,
        port,
        uuid: c.uuid || '',
        password: c.password || undefined,
        method: c.method || undefined,
        connectUrl: this.buildConnectUrl(protocol, host, port, c.uuid || '', c.password || '', (c.metadata as Record<string, unknown>)?.remark as string),
        targetSocks5: { ip: target?.address || '', port: target?.port || 0 },
        remark: (c.metadata as Record<string, unknown>)?.remark as string,
        status: c.enable ? 'active' : 'suspended',
        createdAt: c.createdAt,
      };
    });
  }

  async delete(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, metadata: { path: ['source'], equals: 'gosea-relay' } },
    });
    if (!client) throw new NotFoundException('Relay entry not found');

    // Get nodeId from first inbound tag
    const inbound = client.inboundTags[0] 
      ? await this.prisma.inbound.findFirst({ where: { tag: client.inboundTags[0] } })
      : null;
    const nodeId = inbound?.nodeId;

    // Delete routing rule
    await this.prisma.routingRule.deleteMany({
      where: { tenantId, ruleTag: { startsWith: `gosea-relay-${id.slice(0, 8)}` } },
    });

    // Delete client
    await this.prisma.client.delete({ where: { id } });

    if (nodeId) await this.redis.invalidateNodeCache(nodeId);

    return { success: true };
  }
}
