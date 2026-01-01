import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { SinglePortMultiEgressDto, SinglePortMultiEgressPreviewItem } from '../dto/gosea.dto';

export interface SinglePortMultiEgressResult {
  preview: SinglePortMultiEgressPreviewItem[];
  totalCount: number;
  inboundTag?: string;
  created?: boolean;
}

@Injectable()
export class SinglePortMultiEgressService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private generatePassword(): string {
    return randomBytes(12).toString('base64url');
  }

  private generateUsername(egressIp: string, index: number): string {
    const ipSuffix = egressIp.split('.').slice(-2).join('');
    return `u${index}_${ipSuffix}@gosea`;
  }

  async generate(tenantId: string, dto: SinglePortMultiEgressDto): Promise<SinglePortMultiEgressResult> {
    const { nodeId, port, egressIps, countPerIp, expiresAt, dryRun } = dto;

    // 1. Verify node exists and is online
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, tenantId, status: 'online' },
      include: { egressIps: { where: { isActive: true } } },
    });
    if (!node) throw new NotFoundException('Node not found or offline');

    // 2. Validate egress IPs exist on this node
    const nodeEgressIps = node.egressIps.map(e => e.ip);
    for (const ip of egressIps) {
      if (!nodeEgressIps.includes(ip)) {
        throw new BadRequestException(`Egress IP ${ip} not found on node ${nodeId}`);
      }
    }

    // 3. Generate preview entries
    const preview: SinglePortMultiEgressPreviewItem[] = [];
    const host = node.publicIp || 'unknown';

    for (const egressIp of egressIps) {
      for (let i = 1; i <= countPerIp; i++) {
        const username = this.generateUsername(egressIp, i);
        const password = this.generatePassword();
        preview.push({
          username,
          password,
          egressIp,
          proxyUrl: `socks5://${username}:${password}@${host}:${port}`,
        });
      }
    }

    // 4. If dryRun, return preview only
    if (dryRun) {
      return { preview, totalCount: preview.length };
    }

    // 5. Create or get shared Socks5 Inbound
    const inboundTag = `gosea-socks-${port}`;
    let inbound = await this.prisma.inbound.findFirst({
      where: { nodeId, tag: inboundTag },
    });

    if (!inbound) {
      inbound = await this.prisma.inbound.create({
        data: {
          tenantId,
          nodeId,
          tag: inboundTag,
          protocol: 'socks',
          port,
          listen: '0.0.0.0',
          settings: JSON.stringify({ auth: 'password', accounts: [], udp: true }),
          enable: true,
          remark: `GoSea Single-Port Multi-Egress (port ${port})`,
        },
      });
    }

    // 6. Create Outbounds for each egress IP (if not exists)
    const outboundMap = new Map<string, string>(); // egressIp -> outboundId
    for (const egressIp of egressIps) {
      const outboundTag = `gosea-direct-${egressIp.replace(/\./g, '-')}`;
      let outbound = await this.prisma.outbound.findFirst({
        where: { nodeId, tag: outboundTag },
      });

      if (!outbound) {
        const egressRecord = node.egressIps.find(e => e.ip === egressIp);
        outbound = await this.prisma.outbound.create({
          data: {
            tenantId,
            nodeId,
            tag: outboundTag,
            protocol: 'freedom',
            sendThrough: egressIp,
            egressIpId: egressRecord?.id,
            settings: '{}',
            enable: true,
            remark: `GoSea Direct via ${egressIp}`,
          },
        });
      }
      outboundMap.set(egressIp, outbound.id);
    }

    // 7. Create clients and routing rules
    for (const entry of preview) {
      const outboundId = outboundMap.get(entry.egressIp);
      const outbound = await this.prisma.outbound.findUnique({ where: { id: outboundId } });

      // Create client
      const client = await this.prisma.client.create({
        data: {
          tenantId,
          email: entry.username,
          uuid: uuidv4(),
          password: entry.password,
          level: 0,
          outboundTag: outbound?.tag,
          inboundTags: [inbound.tag],
          enable: true,
          metadata: {
            source: 'gosea-single-port-multi-egress',
            egressIp: entry.egressIp,
            generatedAt: new Date().toISOString(),
          },
          expiryTime: expiresAt ? BigInt(new Date(expiresAt).getTime()) : BigInt(0),
        },
      });

      // Create routing rule (user -> outbound)
      await this.prisma.routingRule.create({
        data: {
          tenantId,
          nodeId,
          ruleTag: `gosea-route-${client.id.slice(0, 8)}`,
          priority: 100,
          ruleConfig: JSON.stringify({
            type: 'field',
            user: [entry.username],
            outboundTag: outbound?.tag,
          }),
          enable: true,
        },
      });
    }

    // 8. Invalidate node cache to trigger config push
    await this.redis.invalidateNodeCache(nodeId);

    return {
      preview,
      totalCount: preview.length,
      inboundTag,
      created: true,
    };
  }

  async exportProxies(tenantId: string, nodeId: string, format: 'txt' | 'csv' | 'json' = 'txt'): Promise<string> {
    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, tenantId },
      select: { publicIp: true },
    });
    if (!node) throw new NotFoundException('Node not found');

    // Get clients with gosea metadata
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId,
        email: { endsWith: '@gosea' },
        metadata: { path: ['source'], equals: 'gosea-single-port-multi-egress' },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get inbounds for these clients
    const allInboundTags = clients.flatMap(c => c.inboundTags);
    const inbounds = await this.prisma.inbound.findMany({
      where: { tag: { in: allInboundTags }, nodeId },
    });
    const inboundMap = new Map(inbounds.map(i => [i.tag, i]));

    // Get outbounds for these clients
    const outboundTags = clients.map(c => c.outboundTag).filter(Boolean) as string[];
    const outbounds = await this.prisma.outbound.findMany({
      where: { tag: { in: outboundTags } },
    });
    const outboundMap = new Map(outbounds.map(o => [o.tag, o]));

    const host = node.publicIp || 'unknown';

    if (format === 'json') {
      const data = clients.map(c => {
        const inbound = c.inboundTags[0] ? inboundMap.get(c.inboundTags[0]) : undefined;
        const outbound = c.outboundTag ? outboundMap.get(c.outboundTag) : undefined;
        return {
          host,
          port: inbound?.port || 0,
          username: c.email,
          password: c.password || '',
          egressIp: outbound?.sendThrough || '',
        };
      });
      return JSON.stringify(data, null, 2);
    }

    if (format === 'csv') {
      const header = 'host,port,username,password,egressIp';
      const rows = clients.map(c => {
        const inbound = c.inboundTags[0] ? inboundMap.get(c.inboundTags[0]) : undefined;
        const outbound = c.outboundTag ? outboundMap.get(c.outboundTag) : undefined;
        const port = inbound?.port || 0;
        return `${host},${port},${c.email},${c.password || ''},${outbound?.sendThrough || ''}`;
      });
      return [header, ...rows].join('\n');
    }

    // txt format: ip:port:user:pass
    return clients.map(c => {
      const inbound = c.inboundTags[0] ? inboundMap.get(c.inboundTags[0]) : undefined;
      const port = inbound?.port || 0;
      return `${host}:${port}:${c.email}:${c.password || ''}`;
    }).join('\n');
  }
}
