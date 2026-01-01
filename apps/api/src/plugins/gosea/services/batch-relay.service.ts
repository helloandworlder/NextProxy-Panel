import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { BatchGenerateRelayDto, BatchGenerateRelayAutoDto, BatchRelayPreviewItem } from '../dto/batch-generate.dto';

export interface BatchRelayResult {
  preview: BatchRelayPreviewItem[];
  totalCount: number;
  created: boolean;
  nodeId: string;
  nodeName: string;
}

@Injectable()
export class BatchRelayService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private generatePassword(): string {
    return randomBytes(16).toString('base64url');
  }

  async generate(tenantId: string, dto: BatchGenerateRelayDto): Promise<BatchRelayResult> {
    // 1. Get relay node and validate
    const node = await this.prisma.node.findFirst({
      where: { id: dto.relayNodeId, tenantId },
    });
    if (!node) throw new NotFoundException('Relay node not found');

    // 2. Get GoSea config from node
    const goSeaConfig = (node.configOverrides as any)?.goSea || {};
    const portRange = dto.portRange || goSeaConfig.relayPortRange || { min: 10000, max: 60000 };
    const ingressIps = goSeaConfig.ingressIps || [];

    // 3. Determine host (ingressIp or publicIp)
    const host = dto.ingressIp || ingressIps[0] || node.publicIp || 'unknown';

    // 4. Generate preview entries
    const preview: BatchRelayPreviewItem[] = [];
    let portCounter = portRange.min;

    for (const socks5 of dto.socks5List) {
      const uuid = uuidv4();
      const password = this.generatePassword();
      
      let port: number;
      if (dto.portMode === 'shared') {
        port = dto.sharedPort || 443;
      } else {
        port = portCounter++;
        if (portCounter > portRange.max) portCounter = portRange.min;
      }

      const connectUrl = this.buildConnectUrl(dto.protocol, host, port, uuid, password, socks5.remark);

      preview.push({
        protocol: dto.protocol,
        host,
        port,
        uuid,
        password: dto.protocol === 'shadowsocks' ? password : undefined,
        connectUrl,
        targetSocks5: { ip: socks5.ip, port: socks5.port },
        remark: socks5.remark,
      });
    }

    // 5. If dryRun, return preview only
    if (dto.dryRun) {
      return { preview, totalCount: preview.length, created: false, nodeId: node.id, nodeName: node.name };
    }

    // 6. Create resources
    await this.createResources(tenantId, node, preview, dto);

    return { preview, totalCount: preview.length, created: true, nodeId: node.id, nodeName: node.name };
  }

  private async createResources(tenantId: string, node: any, preview: BatchRelayPreviewItem[], dto: BatchGenerateRelayDto) {
    // Group by port for shared inbound
    const portGroups = new Map<number, BatchRelayPreviewItem[]>();
    for (const item of preview) {
      if (!portGroups.has(item.port)) portGroups.set(item.port, []);
      portGroups.get(item.port)!.push(item);
    }

    for (const [port, items] of portGroups) {
      // Create or get Inbound
      const inboundTag = `gosea-relay-${dto.protocol}-${port}`;
      let inbound = await this.prisma.inbound.findFirst({ where: { nodeId: node.id, tag: inboundTag } });
      if (!inbound) {
        inbound = await this.prisma.inbound.create({
          data: {
            tenantId, nodeId: node.id, tag: inboundTag, protocol: dto.protocol === 'shadowsocks' ? 'shadowsocks' : dto.protocol,
            port, listen: '0.0.0.0', settings: JSON.stringify(this.buildInboundSettings(dto.protocol)),
            enable: true, remark: `GoSea Batch Relay ${dto.protocol.toUpperCase()} (port ${port})`,
          },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const socks5 = dto.socks5List[preview.indexOf(item)];
        const email = `relay-${item.uuid.slice(0, 8)}@gosea`;

        // Create Socks5 Outbound
        const outboundTag = `gosea-socks5-${socks5.ip.replace(/\./g, '-')}-${socks5.port}`;
        let outbound = await this.prisma.outbound.findFirst({ where: { nodeId: node.id, tag: outboundTag } });
        if (!outbound) {
          outbound = await this.prisma.outbound.create({
            data: {
              tenantId, nodeId: node.id, tag: outboundTag, protocol: 'socks',
              settings: JSON.stringify({
                servers: [{ address: socks5.ip, port: socks5.port, users: [{ user: socks5.username, pass: socks5.password }] }],
              }),
              enable: true, remark: `GoSea Socks5 to ${socks5.ip}:${socks5.port}`,
            },
          });
        }

        // Create Client
        const client = await this.prisma.client.create({
          data: {
            tenantId, email, uuid: item.uuid, password: item.password, method: dto.protocol === 'shadowsocks' ? 'aes-256-gcm' : undefined,
            level: 0, outboundTag: outbound.tag, inboundTags: [inbound.tag], enable: true,
            metadata: { source: 'gosea-batch-relay', protocol: dto.protocol, remark: item.remark },
            expiryTime: dto.expiresAt ? BigInt(new Date(dto.expiresAt).getTime()) : BigInt(0),
          },
        });

        // Create Routing Rule
        await this.prisma.routingRule.create({
          data: {
            tenantId, nodeId: node.id, ruleTag: `gosea-relay-${client.id.slice(0, 8)}`, priority: 50,
            ruleConfig: JSON.stringify({ type: 'field', user: [email], outboundTag: outbound.tag }),
            enable: true,
          },
        });
      }
    }

    await this.redis.invalidateNodeCache(node.id);
  }

  private buildInboundSettings(protocol: string): Record<string, unknown> {
    switch (protocol) {
      case 'vless': return { decryption: 'none', clients: [] };
      case 'vmess': return { clients: [] };
      case 'shadowsocks': return { method: 'aes-256-gcm', password: '', network: 'tcp,udp' };
      case 'trojan': return { clients: [] };
      default: return {};
    }
  }

  private buildConnectUrl(protocol: string, host: string, port: number, uuid: string, password: string, remark?: string): string {
    const name = encodeURIComponent(remark || 'GoSea-Relay');
    switch (protocol) {
      case 'vless': return `vless://${uuid}@${host}:${port}?encryption=none&type=tcp#${name}`;
      case 'vmess': {
        const cfg = { v: '2', ps: remark || 'GoSea-Relay', add: host, port, id: uuid, aid: 0, net: 'tcp', type: 'none', tls: '' };
        return `vmess://${Buffer.from(JSON.stringify(cfg)).toString('base64')}`;
      }
      case 'shadowsocks': return `ss://${Buffer.from(`aes-256-gcm:${password}`).toString('base64')}@${host}:${port}#${name}`;
      case 'trojan': return `trojan://${uuid}@${host}:${port}?type=tcp#${name}`;
      default: return '';
    }
  }

  /**
   * Auto-generate Relay from existing Socks5 nodes
   * Automatically fetches Socks5 pool entries by country codes
   */
  async generateAuto(tenantId: string, dto: BatchGenerateRelayAutoDto): Promise<BatchRelayResult> {
    // 1. Get nodes to find their country codes
    const nodes = await this.prisma.node.findMany({
      where: { id: { in: dto.socks5NodeIds }, tenantId },
    });

    if (nodes.length === 0) {
      throw new BadRequestException('No nodes found with specified IDs');
    }

    const countryCodes = nodes.map(n => n.countryCode).filter(Boolean) as string[];

    // 2. Fetch Socks5 pool entries matching those country codes
    const socks5Pools = await this.prisma.goSeaSocks5Pool.findMany({
      where: {
        tenantId,
        countryCode: { in: countryCodes.length > 0 ? countryCodes : ['XX'] },
        status: 'available',
      },
    });

    if (socks5Pools.length === 0) {
      throw new BadRequestException('No available Socks5 entries found for specified nodes');
    }

    // 3. Convert to socks5List format
    const socks5List = socks5Pools.map(pool => ({
      ip: pool.ip,
      port: pool.port,
      username: pool.username,
      password: pool.password,
      remark: `${pool.countryCode || 'XX'}-${pool.cityName || pool.cityCode || 'Unknown'}`,
    }));

    // 4. Call the standard generate method
    const relayDto: BatchGenerateRelayDto = {
      relayNodeId: dto.relayNodeId,
      protocol: dto.protocol,
      socks5List,
      portMode: dto.portMode,
      sharedPort: dto.sharedPort,
      portRange: dto.portRange,
      ingressIp: dto.ingressIp,
      expiresAt: dto.expiresAt,
      dryRun: dto.dryRun,
    };

    return this.generate(tenantId, relayDto);
  }
}
