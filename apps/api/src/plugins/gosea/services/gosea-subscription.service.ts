import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { randomBytes } from 'crypto';

type SubscriptionFormat = 'clash' | 'v2ray' | 'singbox' | 'shadowrocket' | 'link' | 'json';

interface RelayNode {
  protocol: string;
  uuid: string;
  host: string;
  port: number;
  name: string;
}

@Injectable()
export class GoSeaSubscriptionService {
  constructor(private prisma: PrismaService) {}

  async generateSubscription(tenantId: string, dto: { externalUserId: string; relayIds: string[]; expiresAt?: string }) {
    const token = randomBytes(32).toString('hex');
    const sub = await this.prisma.goSeaSubscription.create({
      data: {
        tenantId, token, externalUserId: dto.externalUserId, relayIds: dto.relayIds,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return { token: sub.token, subscriptionUrl: `/plugins/gosea/subscription/${sub.token}` };
  }

  async getSubscription(token: string, format: SubscriptionFormat = 'clash') {
    const sub = await this.prisma.goSeaSubscription.findUnique({ where: { token } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.expiresAt && sub.expiresAt < new Date()) throw new NotFoundException('Subscription expired');

    const relays = await this.prisma.goSeaRelayEndpoint.findMany({
      where: { id: { in: sub.relayIds }, status: 'active' },
      include: { node: { select: { publicIp: true, countryCode: true, countryName: true } } },
    });

    const nodes: RelayNode[] = relays.map((r, i) => ({
      protocol: r.protocol, uuid: r.uuid, host: r.node.publicIp || '', port: r.inboundPort,
      name: `GoSea-${r.node.countryCode || 'Relay'}-${i + 1}`,
    }));

    switch (format) {
      case 'clash': return this.generateClash(nodes);
      case 'v2ray': return this.generateV2ray(nodes);
      case 'singbox': return this.generateSingbox(nodes);
      case 'shadowrocket': return this.generateV2ray(nodes);
      case 'link': return this.generateLinks(nodes);
      case 'json': return JSON.stringify({ nodes: nodes.map(n => ({ ...n, link: this.toLink(n) })) }, null, 2);
      default: return this.generateClash(nodes);
    }
  }

  private generateLinks(nodes: RelayNode[]): string {
    return nodes.map(n => this.toLink(n)).join('\n');
  }

  private toLink(n: RelayNode): string {
    const name = encodeURIComponent(n.name);
    switch (n.protocol) {
      case 'vless': return `vless://${n.uuid}@${n.host}:${n.port}?encryption=none&type=tcp#${name}`;
      case 'vmess': {
        const vmess = { v: '2', ps: n.name, add: n.host, port: n.port, id: n.uuid, aid: 0, scy: 'auto', net: 'tcp', tls: '' };
        return `vmess://${Buffer.from(JSON.stringify(vmess)).toString('base64')}`;
      }
      case 'shadowsocks': return `ss://${Buffer.from(`aes-256-gcm:${n.uuid}`).toString('base64')}@${n.host}:${n.port}#${name}`;
      case 'trojan': return `trojan://${n.uuid}@${n.host}:${n.port}?type=tcp#${name}`;
      default: return '';
    }
  }

  private generateV2ray(nodes: RelayNode[]): string {
    return Buffer.from(nodes.map(n => this.toLink(n)).join('\n')).toString('base64');
  }

  private generateClash(nodes: RelayNode[]): string {
    const proxies = nodes.map(n => this.toClashProxy(n));
    const names = nodes.map(n => n.name);
    const config = {
      port: 7890, 'socks-port': 7891, 'allow-lan': false, mode: 'rule', 'log-level': 'info',
      proxies,
      'proxy-groups': [
        { name: 'Proxy', type: 'select', proxies: ['Auto', ...names, 'DIRECT'] },
        { name: 'Auto', type: 'url-test', proxies: names, url: 'http://www.gstatic.com/generate_204', interval: 300 },
      ],
      rules: ['GEOIP,CN,DIRECT', 'MATCH,Proxy'],
    };
    return this.yamlStringify(config);
  }

  private toClashProxy(n: RelayNode): Record<string, any> {
    const base = { name: n.name, server: n.host, port: n.port };
    switch (n.protocol) {
      case 'vless': return { ...base, type: 'vless', uuid: n.uuid, network: 'tcp', tls: false };
      case 'vmess': return { ...base, type: 'vmess', uuid: n.uuid, alterId: 0, cipher: 'auto', network: 'tcp', tls: false };
      case 'shadowsocks': return { ...base, type: 'ss', cipher: 'aes-256-gcm', password: n.uuid };
      case 'trojan': return { ...base, type: 'trojan', password: n.uuid, sni: n.host };
      default: return base;
    }
  }

  private generateSingbox(nodes: RelayNode[]): string {
    const outbounds = nodes.map(n => this.toSingboxOutbound(n));
    const names = nodes.map(n => n.name);
    return JSON.stringify({
      log: { level: 'info' },
      inbounds: [{ type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 7890 }],
      outbounds: [
        { type: 'selector', tag: 'proxy', outbounds: ['auto', ...names, 'direct'] },
        { type: 'urltest', tag: 'auto', outbounds: names, url: 'http://www.gstatic.com/generate_204', interval: '5m' },
        ...outbounds,
        { type: 'direct', tag: 'direct' },
      ],
      route: { final: 'proxy' },
    }, null, 2);
  }

  private toSingboxOutbound(n: RelayNode): Record<string, any> {
    const base = { tag: n.name, server: n.host, server_port: n.port };
    switch (n.protocol) {
      case 'vless': return { ...base, type: 'vless', uuid: n.uuid };
      case 'vmess': return { ...base, type: 'vmess', uuid: n.uuid, alter_id: 0, security: 'auto' };
      case 'shadowsocks': return { ...base, type: 'shadowsocks', method: 'aes-256-gcm', password: n.uuid };
      case 'trojan': return { ...base, type: 'trojan', password: n.uuid };
      default: return base;
    }
  }

  private yamlStringify(obj: any, indent = 0): string {
    const sp = '  '.repeat(indent);
    let r = '';
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        r += `${sp}${k}:\n`;
        for (const item of v) {
          if (typeof item === 'object') r += `${sp}- ${this.yamlStringify(item, indent + 1).trim().replace(/\n/g, `\n${sp}  `)}\n`;
          else r += `${sp}- ${item}\n`;
        }
      } else if (typeof v === 'object') r += `${sp}${k}:\n${this.yamlStringify(v, indent + 1)}`;
      else r += `${sp}${k}: ${v}\n`;
    }
    return r;
  }
}
