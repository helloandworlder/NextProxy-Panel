import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type SubscriptionFormat = 'clash' | 'v2ray' | 'singbox' | 'shadowrocket' | 'surge' | 'link' | 'json';

interface ProxyNode {
  name: string;
  type: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  flow?: string;
  alterId?: number;
  cipher?: string;
  network?: string;
  tls?: boolean;
  sni?: string;
  wsPath?: string;
  wsHost?: string;
  grpcServiceName?: string;
  // Reality support
  security?: string;
  realityPublicKey?: string;
  realityShortId?: string;
  fingerprint?: string;
  // H2 support
  h2Path?: string;
  h2Host?: string[];
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(subId: string, format: SubscriptionFormat = 'clash') {
    const client = await this.prisma.client.findFirst({
      where: { subId, enable: true },
    });

    if (!client) throw new NotFoundException('Subscription not found');

    // Check expiry
    if (client.expiryTime > 0 && client.expiryTime < Date.now()) {
      throw new NotFoundException('Subscription expired');
    }

    // Check quota
    if (client.totalBytes > 0 && client.usedBytes >= client.totalBytes) {
      throw new NotFoundException('Traffic quota exceeded');
    }

    // Get inbounds by tags
    const inbounds = await this.prisma.inbound.findMany({
      where: { 
        tag: { in: client.inboundTags },
        enable: true,
      },
      include: { node: true },
    });

    // Build proxy nodes
    const nodes = this.buildProxyNodes(client, inbounds);

    switch (format) {
      case 'clash':
        return this.generateClash(nodes, client.email);
      case 'v2ray':
        return this.generateV2ray(nodes);
      case 'singbox':
        return this.generateSingbox(nodes, client.email);
      case 'shadowrocket':
        return this.generateShadowrocket(nodes);
      case 'surge':
        return this.generateSurge(nodes, client.email);
      case 'link':
        return this.generateLinks(nodes);
      case 'json':
        return this.generateJson(nodes);
      default:
        return this.generateClash(nodes, client.email);
    }
  }

  /**
   * Get single node link for a client
   */
  async getNodeLink(clientId: string, inboundId: string): Promise<string> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, enable: true },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const inbound = await this.prisma.inbound.findFirst({
      where: { id: inboundId, tag: { in: client.inboundTags } },
      include: { node: true },
    });

    if (!inbound) {
      throw new NotFoundException('Inbound access not found');
    }

    const nodes = this.buildProxyNodes(client, [inbound]);
    if (nodes.length === 0) throw new NotFoundException('No available nodes');

    return this.toV2rayLink(nodes[0]);
  }

  /**
   * Generate plain text links (one per line)
   */
  private generateLinks(nodes: ProxyNode[]): string {
    return nodes.map((n) => this.toV2rayLink(n)).join('\n');
  }

  /**
   * Generate JSON format for API consumption
   */
  private generateJson(nodes: ProxyNode[]): string {
    return JSON.stringify({
      nodes: nodes.map((n) => ({
        name: n.name,
        type: n.type,
        server: n.server,
        port: n.port,
        link: this.toV2rayLink(n),
      })),
    }, null, 2);
  }

  private buildProxyNodes(client: any, inbounds: any[]): ProxyNode[] {
    const nodes: ProxyNode[] = [];

    for (const inbound of inbounds) {
      const node = inbound.node;
      if (!node || node.status !== 'online') continue;

      const streamSettings = inbound.streamSettings ? JSON.parse(inbound.streamSettings) : {};
      const network = streamSettings.network || 'tcp';
      const security = streamSettings.security || 'none';

      const proxyNode: ProxyNode = {
        name: `${node.countryName || node.name}-${inbound.tag}`,
        type: inbound.protocol,
        server: node.publicIp || node.name,
        port: inbound.port,
        network,
        security,
        tls: security === 'tls',
        sni: streamSettings.tlsSettings?.serverName || inbound.tlsServerName,
      };

      // Reality support
      if (security === 'reality') {
        const realitySettings = streamSettings.realitySettings || {};
        proxyNode.realityPublicKey = realitySettings.publicKey || '';
        proxyNode.realityShortId = realitySettings.shortIds?.[0] || '';
        proxyNode.sni = realitySettings.serverNames?.[0];
        proxyNode.fingerprint = realitySettings.fingerprint || 'chrome';
      }

      // Protocol specific fields
      if (inbound.protocol === 'vless' || inbound.protocol === 'vmess') {
        proxyNode.uuid = client.uuid;
        if (inbound.protocol === 'vless') {
          proxyNode.flow = client.flow;
        } else {
          proxyNode.alterId = 0;
          proxyNode.cipher = 'auto';
        }
      } else if (inbound.protocol === 'trojan') {
        proxyNode.password = client.password;
      } else if (inbound.protocol === 'shadowsocks') {
        proxyNode.password = client.password;
        proxyNode.cipher = client.method || 'aes-256-gcm';
      }

      // Transport specific
      if (network === 'ws') {
        proxyNode.wsPath = streamSettings.wsSettings?.path || '/';
        proxyNode.wsHost = streamSettings.wsSettings?.headers?.Host;
      } else if (network === 'grpc') {
        proxyNode.grpcServiceName = streamSettings.grpcSettings?.serviceName;
      } else if (network === 'h2') {
        proxyNode.h2Path = streamSettings.httpSettings?.path || '/';
        proxyNode.h2Host = streamSettings.httpSettings?.host;
      }

      nodes.push(proxyNode);
    }

    return nodes;
  }

  // Derive public key from private key (placeholder - actual implementation needs x25519)
  private derivePublicKey(privateKey?: string | null): string {
    // In production, use proper x25519 key derivation
    // For now, return empty if no public key available
    return privateKey ? '' : '';
  }

  private generateClash(nodes: ProxyNode[], _clientName: string): string {
    const proxies = nodes.map((n) => this.toClashProxy(n));
    const proxyNames = nodes.map((n) => n.name);

    const config = {
      port: 7890,
      'socks-port': 7891,
      'allow-lan': false,
      mode: 'rule',
      'log-level': 'info',
      proxies,
      'proxy-groups': [
        { name: 'Proxy', type: 'select', proxies: ['Auto', ...proxyNames, 'DIRECT'] },
        { name: 'Auto', type: 'url-test', proxies: proxyNames, url: 'http://www.gstatic.com/generate_204', interval: 300 },
      ],
      rules: [
        'GEOIP,CN,DIRECT',
        'MATCH,Proxy',
      ],
    };

    return this.yamlStringify(config);
  }

  private toClashProxy(node: ProxyNode): Record<string, any> {
    const proxy: Record<string, any> = {
      name: node.name,
      type: node.type === 'shadowsocks' ? 'ss' : node.type,
      server: node.server,
      port: node.port,
    };

    if (node.type === 'vless') {
      proxy.uuid = node.uuid;
      proxy.flow = node.flow;
      proxy.network = node.network;
      
      // Reality support for Clash Meta
      if (node.security === 'reality') {
        proxy.tls = true;
        proxy['reality-opts'] = {
          'public-key': node.realityPublicKey,
          'short-id': node.realityShortId,
        };
        proxy.servername = node.sni;
        proxy['client-fingerprint'] = node.fingerprint || 'chrome';
      } else {
        proxy.tls = node.tls;
        proxy.servername = node.sni;
      }
      
      if (node.network === 'ws') {
        proxy['ws-opts'] = { path: node.wsPath, headers: node.wsHost ? { Host: node.wsHost } : undefined };
      } else if (node.network === 'grpc') {
        proxy['grpc-opts'] = { 'grpc-service-name': node.grpcServiceName };
      } else if (node.network === 'h2') {
        proxy['h2-opts'] = { path: node.h2Path, host: node.h2Host };
      }
    } else if (node.type === 'vmess') {
      proxy.uuid = node.uuid;
      proxy.alterId = node.alterId;
      proxy.cipher = node.cipher;
      proxy.tls = node.tls;
      proxy.servername = node.sni;
      proxy.network = node.network;
      if (node.network === 'ws') {
        proxy['ws-opts'] = { path: node.wsPath, headers: node.wsHost ? { Host: node.wsHost } : undefined };
      }
    } else if (node.type === 'trojan') {
      proxy.password = node.password;
      proxy.sni = node.sni;
      proxy['skip-cert-verify'] = false;
      proxy.network = node.network;
      if (node.network === 'ws') {
        proxy['ws-opts'] = { path: node.wsPath };
      } else if (node.network === 'grpc') {
        proxy['grpc-opts'] = { 'grpc-service-name': node.grpcServiceName };
      }
    } else if (node.type === 'shadowsocks') {
      proxy.cipher = node.cipher;
      proxy.password = node.password;
    }

    return proxy;
  }

  private generateV2ray(nodes: ProxyNode[]): string {
    const links = nodes.map((n) => this.toV2rayLink(n));
    return Buffer.from(links.join('\n')).toString('base64');
  }

  private toV2rayLink(node: ProxyNode): string {
    if (node.type === 'vless') {
      const params = new URLSearchParams();
      params.set('type', node.network || 'tcp');
      
      // Security settings
      if (node.security === 'reality') {
        params.set('security', 'reality');
        if (node.realityPublicKey) params.set('pbk', node.realityPublicKey);
        if (node.realityShortId) params.set('sid', node.realityShortId);
        if (node.fingerprint) params.set('fp', node.fingerprint);
        if (node.sni) params.set('sni', node.sni);
      } else if (node.tls) {
        params.set('security', 'tls');
        if (node.sni) params.set('sni', node.sni);
      }
      
      if (node.flow) params.set('flow', node.flow);
      
      // Transport settings
      if (node.network === 'ws' && node.wsPath) {
        params.set('path', node.wsPath);
        if (node.wsHost) params.set('host', node.wsHost);
      }
      if (node.network === 'grpc' && node.grpcServiceName) {
        params.set('serviceName', node.grpcServiceName);
        params.set('mode', 'gun');
      }
      if (node.network === 'h2' && node.h2Path) {
        params.set('path', node.h2Path);
        if (node.h2Host?.length) params.set('host', node.h2Host[0]);
      }
      
      return `vless://${node.uuid}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
    } else if (node.type === 'vmess') {
      const vmessConfig = {
        v: '2', ps: node.name, add: node.server, port: node.port,
        id: node.uuid, aid: node.alterId, scy: node.cipher,
        net: node.network, tls: node.tls ? 'tls' : '',
        sni: node.sni, path: node.wsPath, host: node.wsHost,
      };
      return `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
    } else if (node.type === 'trojan') {
      const params = new URLSearchParams();
      if (node.sni) params.set('sni', node.sni);
      params.set('type', node.network || 'tcp');
      if (node.network === 'ws' && node.wsPath) params.set('path', node.wsPath);
      if (node.network === 'grpc' && node.grpcServiceName) params.set('serviceName', node.grpcServiceName);
      return `trojan://${node.password}@${node.server}:${node.port}?${params.toString()}#${encodeURIComponent(node.name)}`;
    } else if (node.type === 'shadowsocks') {
      const userinfo = Buffer.from(`${node.cipher}:${node.password}`).toString('base64');
      return `ss://${userinfo}@${node.server}:${node.port}#${encodeURIComponent(node.name)}`;
    }
    return '';
  }

  private generateSingbox(nodes: ProxyNode[], _clientName: string): string {
    const outbounds = nodes.map((n) => this.toSingboxOutbound(n));
    const config = {
      log: { level: 'info' },
      dns: { servers: [{ tag: 'dns', address: '8.8.8.8' }] },
      inbounds: [
        { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 7890 },
      ],
      outbounds: [
        { type: 'selector', tag: 'proxy', outbounds: ['auto', ...nodes.map((n) => n.name), 'direct'] },
        { type: 'urltest', tag: 'auto', outbounds: nodes.map((n) => n.name), url: 'http://www.gstatic.com/generate_204', interval: '5m' },
        ...outbounds,
        { type: 'direct', tag: 'direct' },
        { type: 'block', tag: 'block' },
      ],
      route: { rules: [{ geoip: ['cn'], outbound: 'direct' }], final: 'proxy' },
    };
    return JSON.stringify(config, null, 2);
  }

  private toSingboxOutbound(node: ProxyNode): Record<string, any> {
    const outbound: Record<string, any> = { tag: node.name, type: node.type, server: node.server, server_port: node.port };

    if (node.type === 'vless') {
      outbound.uuid = node.uuid;
      outbound.flow = node.flow;
      if (node.tls) outbound.tls = { enabled: true, server_name: node.sni };
      if (node.network === 'ws') outbound.transport = { type: 'ws', path: node.wsPath, headers: node.wsHost ? { Host: node.wsHost } : undefined };
      if (node.network === 'grpc') outbound.transport = { type: 'grpc', service_name: node.grpcServiceName };
    } else if (node.type === 'vmess') {
      outbound.uuid = node.uuid;
      outbound.alter_id = node.alterId;
      outbound.security = node.cipher;
      if (node.tls) outbound.tls = { enabled: true, server_name: node.sni };
      if (node.network === 'ws') outbound.transport = { type: 'ws', path: node.wsPath };
    } else if (node.type === 'trojan') {
      outbound.password = node.password;
      outbound.tls = { enabled: true, server_name: node.sni };
    } else if (node.type === 'shadowsocks') {
      outbound.method = node.cipher;
      outbound.password = node.password;
    }

    return outbound;
  }

  private generateShadowrocket(nodes: ProxyNode[]): string {
    return this.generateV2ray(nodes); // Shadowrocket uses same format
  }

  private generateSurge(nodes: ProxyNode[], _clientName: string): string {
    const proxyLines = nodes.map((n) => this.toSurgeLine(n));
    const proxyNames = nodes.map((n) => n.name);
    return `[General]
loglevel = notify
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local

[Proxy]
${proxyLines.join('\n')}

[Proxy Group]
Proxy = select, ${proxyNames.join(', ')}, DIRECT

[Rule]
GEOIP,CN,DIRECT
FINAL,Proxy`;
  }

  private toSurgeLine(node: ProxyNode): string {
    if (node.type === 'trojan') {
      return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password}, sni=${node.sni}`;
    } else if (node.type === 'shadowsocks') {
      return `${node.name} = ss, ${node.server}, ${node.port}, encrypt-method=${node.cipher}, password=${node.password}`;
    } else if (node.type === 'vmess') {
      return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, tls=${node.tls}`;
    }
    return `${node.name} = direct`;
  }

  private yamlStringify(obj: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            result += `${spaces}- ${this.yamlStringify(item, indent + 1).trim().replace(/\n/g, `\n${spaces}  `)}\n`;
          } else {
            result += `${spaces}- ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        result += `${spaces}${key}:\n${this.yamlStringify(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${value}\n`;
      }
    }
    return result;
  }
}
