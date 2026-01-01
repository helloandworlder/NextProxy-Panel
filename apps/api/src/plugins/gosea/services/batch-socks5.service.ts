import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { BatchGenerateSocks5Dto, BatchSocks5PreviewItem } from '../dto/batch-generate.dto';

export interface BatchSocks5Result {
  preview: BatchSocks5PreviewItem[];
  totalCount: number;
  created: boolean;
  nodeId: string;
  nodeName: string;
}

@Injectable()
export class BatchSocks5Service {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private generatePassword(length = 16): string {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  private generateUsername(prefix: string, index: number, egressIp?: string): string {
    const ipSuffix = egressIp ? egressIp.split('.').slice(-1)[0] : '';
    return `${prefix}${index}${ipSuffix ? '_' + ipSuffix : ''}@gosea`;
  }

  async generate(tenantId: string, dto: BatchGenerateSocks5Dto): Promise<BatchSocks5Result> {
    // 1. Get node and validate
    const node = await this.prisma.node.findFirst({
      where: { id: dto.nodeId, tenantId },
      include: { egressIps: { where: { isActive: true } } },
    });
    if (!node) throw new NotFoundException('Node not found');

    // 2. Get GoSea config from node
    const goSeaConfig = (node.configOverrides as any)?.goSea || {};
    const portRange = dto.portRange || goSeaConfig.socks5PortRange || { min: 10000, max: 60000 };

    // 3. Determine egress IPs
    let egressIps = dto.egressIps || goSeaConfig.egressIps || [];
    if (egressIps.length === 0 && node.egressIps.length > 0) {
      egressIps = node.egressIps.map(e => e.ip);
    }
    if (egressIps.length === 0 && node.publicIp) {
      egressIps = [node.publicIp];
    }
    if (egressIps.length === 0) {
      throw new BadRequestException('No egress IPs available on this node');
    }

    // 4. Calculate distribution
    const totalSlots = egressIps.length * dto.oversellCount;
    if (dto.count > totalSlots * 1000) {
      throw new BadRequestException(`Count ${dto.count} exceeds max capacity (${totalSlots * 1000})`);
    }

    // 5. Generate preview entries
    const preview: BatchSocks5PreviewItem[] = [];
    const host = dto.ingressEqualsEgress ? '' : (node.publicIp || 'unknown');
    let portCounter = portRange.min;
    let userIndex = 1;

    for (let i = 0; i < dto.count; i++) {
      const egressIp = egressIps[i % egressIps.length];
      const entryHost = dto.ingressEqualsEgress ? egressIp : host;
      const username = this.generateUsername('gs', userIndex++, egressIp);
      const password = this.generatePassword();

      let port: number;
      if (dto.portMode === 'single') {
        port = dto.singlePort || 1080;
      } else {
        port = portCounter++;
        if (portCounter > portRange.max) portCounter = portRange.min;
      }

      preview.push({
        host: entryHost,
        port,
        username,
        password,
        egressIp,
        proxyUrl: `socks5://${username}:${password}@${entryHost}:${port}`,
      });
    }

    // 6. If dryRun, return preview only
    if (dto.dryRun) {
      return { preview, totalCount: preview.length, created: false, nodeId: node.id, nodeName: node.name };
    }

    // 7. Create inbounds, outbounds, clients, and routing rules
    await this.createResources(tenantId, node, preview, dto);

    return { preview, totalCount: preview.length, created: true, nodeId: node.id, nodeName: node.name };
  }

  private async createResources(tenantId: string, node: any, preview: BatchSocks5PreviewItem[], dto: BatchGenerateSocks5Dto) {
    // Group by port for inbound creation
    const portGroups = new Map<number, BatchSocks5PreviewItem[]>();
    for (const item of preview) {
      if (!portGroups.has(item.port)) portGroups.set(item.port, []);
      portGroups.get(item.port)!.push(item);
    }

    // Group by egressIp for outbound creation
    const egressGroups = new Map<string, string>(); // egressIp -> outboundTag

    for (const [port, items] of portGroups) {
      // Create or get Socks5 Inbound
      const inboundTag = `gosea-socks5-${port}`;
      let inbound = await this.prisma.inbound.findFirst({ where: { nodeId: node.id, tag: inboundTag } });
      if (!inbound) {
        inbound = await this.prisma.inbound.create({
          data: {
            tenantId, nodeId: node.id, tag: inboundTag, protocol: 'socks', port, listen: '0.0.0.0',
            settings: JSON.stringify({ auth: 'password', accounts: [], udp: true }),
            enable: true, remark: `GoSea Batch Socks5 (port ${port})`,
          },
        });
      }

      for (const item of items) {
        // Create or get Outbound for egress IP
        let outboundTag = egressGroups.get(item.egressIp);
        if (!outboundTag) {
          outboundTag = `gosea-direct-${item.egressIp.replace(/\./g, '-')}`;
          let outbound = await this.prisma.outbound.findFirst({ where: { nodeId: node.id, tag: outboundTag } });
          if (!outbound) {
            const egressRecord = node.egressIps?.find((e: any) => e.ip === item.egressIp);
            outbound = await this.prisma.outbound.create({
              data: {
                tenantId, nodeId: node.id, tag: outboundTag, protocol: 'freedom',
                sendThrough: item.egressIp, egressIpId: egressRecord?.id, settings: '{}',
                enable: true, remark: `GoSea Direct via ${item.egressIp}`,
              },
            });
          }
          egressGroups.set(item.egressIp, outboundTag);
        }

        // Create Client
        const client = await this.prisma.client.create({
          data: {
            tenantId, email: item.username, uuid: uuidv4(), password: item.password, level: 0,
            outboundTag, inboundTags: [inboundTag], enable: true,
            metadata: { source: 'gosea-batch-socks5', egressIp: item.egressIp, generatedAt: new Date().toISOString() },
            expiryTime: dto.expiresAt ? BigInt(new Date(dto.expiresAt).getTime()) : BigInt(0),
          },
        });

        // Create Routing Rule
        await this.prisma.routingRule.create({
          data: {
            tenantId, nodeId: node.id, ruleTag: `gosea-route-${client.id.slice(0, 8)}`, priority: 100,
            ruleConfig: JSON.stringify({ type: 'field', user: [item.username], outboundTag }),
            enable: true,
          },
        });
      }
    }

    // Invalidate cache
    await this.redis.invalidateNodeCache(node.id);
  }
}
