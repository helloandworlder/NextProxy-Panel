/**
 * XrayNodeConfigBuilder - Builds complete Xray config for a node
 * Aggregates all inbounds, outbounds, routing rules for a specific node
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  XrayConfig,
  XrayInboundConfig,
  XrayOutboundConfig,
  XrayClientConfig,
} from './xray-config-builder';

@Injectable()
export class XrayNodeConfigBuilder {
  constructor(private prisma: PrismaService) {}

  /**
   * Build complete Xray config for a node
   */
  async buildNodeConfig(nodeId: string): Promise<XrayConfig> {
    // Fetch all data for this node
    const [inbounds, outbounds, routingRules, balancers, dnsConfig, policyConfig] =
      await Promise.all([
        this.prisma.inbound.findMany({
          where: { nodeId, enable: true },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.outbound.findMany({
          where: { nodeId, enable: true },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.routingRule.findMany({
          where: { nodeId, enable: true },
          orderBy: { priority: 'asc' },
        }),
        this.prisma.balancer.findMany({
          where: { nodeId, enable: true },
        }),
        this.prisma.dnsConfig.findFirst({
          where: { nodeId, enable: true },
        }),
        this.prisma.policyConfig.findFirst({
          where: { nodeId, enable: true },
        }),
      ]);

    // Build config
    const config: XrayConfig = {
      log: { loglevel: 'warning' },
      api: {
        tag: 'api',
        services: ['HandlerService', 'LoggerService', 'StatsService'],
      },
      stats: {},
      inbounds: this.buildInboundsConfig(inbounds),
      outbounds: this.buildOutboundsConfig(outbounds),
      routing: this.buildRoutingConfig(routingRules, balancers),
      policy: this.buildPolicyConfig(policyConfig),
    };

    // Add DNS if configured
    if (dnsConfig) {
      config.dns = JSON.parse(dnsConfig.dnsConfig);
    }

    return config;
  }

  /**
   * Build inbounds array from database records
   */
  private buildInboundsConfig(inbounds: any[]): XrayInboundConfig[] {
    // Always include API inbound
    const apiInbound: XrayInboundConfig = {
      tag: 'api',
      protocol: 'dokodemo-door',
      port: 62789,
      listen: '127.0.0.1',
      settings: { address: '127.0.0.1' },
    };

    const userInbounds = inbounds.map((inbound) => ({
      tag: inbound.tag,
      protocol: inbound.protocol,
      port: inbound.port,
      listen: inbound.listen || '0.0.0.0',
      settings: JSON.parse(inbound.settings || '{}'),
      streamSettings: JSON.parse(inbound.streamSettings || '{}'),
      sniffing: JSON.parse(inbound.sniffing || '{}'),
    }));

    return [apiInbound, ...userInbounds];
  }

  /**
   * Build outbounds array from database records
   */
  private buildOutboundsConfig(outbounds: any[]): XrayOutboundConfig[] {
    // Default outbounds
    const defaultOutbounds: XrayOutboundConfig[] = [
      { tag: 'direct', protocol: 'freedom', settings: {} },
      { tag: 'blocked', protocol: 'blackhole', settings: {} },
    ];

    const userOutbounds = outbounds.map((outbound) => {
      const config: XrayOutboundConfig = {
        tag: outbound.tag,
        protocol: outbound.protocol,
        settings: JSON.parse(outbound.settings || '{}'),
      };

      if (outbound.sendThrough) {
        config.sendThrough = outbound.sendThrough;
      }

      const streamSettings = outbound.streamSettings
        ? JSON.parse(outbound.streamSettings)
        : null;
      if (streamSettings && Object.keys(streamSettings).length > 0) {
        config.streamSettings = streamSettings;
      }

      const proxySettings = outbound.proxySettings
        ? JSON.parse(outbound.proxySettings)
        : null;
      if (proxySettings && Object.keys(proxySettings).length > 0) {
        config.proxySettings = proxySettings;
      }

      const muxSettings = outbound.muxSettings
        ? JSON.parse(outbound.muxSettings)
        : null;
      if (muxSettings && Object.keys(muxSettings).length > 0) {
        config.mux = muxSettings;
      }

      return config;
    });

    return [...defaultOutbounds, ...userOutbounds];
  }

  /**
   * Build routing config from database records
   */
  private buildRoutingConfig(rules: any[], balancers: any[]): any {
    const routing: any = {
      domainStrategy: 'AsIs',
      rules: [
        // API routing rule (always first)
        {
          type: 'field',
          inboundTag: ['api'],
          outboundTag: 'api',
        },
      ],
    };

    // Add user rules
    for (const rule of rules) {
      const ruleConfig: any = {
        type: 'field',
      };

      // Parse rule content
      const content = JSON.parse(rule.ruleConfig || '{}');
      Object.assign(ruleConfig, content);

      // Set outbound or balancer
      if (rule.outboundTag) {
        ruleConfig.outboundTag = rule.outboundTag;
      } else if (rule.balancerTag) {
        ruleConfig.balancerTag = rule.balancerTag;
      }

      routing.rules.push(ruleConfig);
    }

    // Add balancers if any
    if (balancers.length > 0) {
      routing.balancers = balancers.map((b) => ({
        tag: b.tag,
        selector: b.selector,
        strategy: JSON.parse(b.strategy || '{"type":"random"}'),
      }));
    }

    return routing;
  }

  /**
   * Build policy config
   */
  private buildPolicyConfig(policyConfig: any): any {
    if (policyConfig) {
      return JSON.parse(policyConfig.policyConfig);
    }

    // Default policy with stats enabled
    return {
      levels: {
        '0': {
          statsUserUplink: true,
          statsUserDownlink: true,
        },
      },
      system: {
        statsInboundUplink: true,
        statsInboundDownlink: true,
        statsOutboundUplink: true,
        statsOutboundDownlink: true,
      },
    };
  }

  /**
   * Inject clients into inbound settings
   */
  injectClients(
    inboundSettings: Record<string, any>,
    clients: XrayClientConfig[],
    protocol: string,
  ): Record<string, any> {
    const settings = { ...inboundSettings };

    switch (protocol) {
      case 'vless':
      case 'vmess':
      case 'trojan':
        settings.clients = clients.map((c) => ({
          id: c.id,
          email: c.email,
          level: c.level,
          flow: c.flow,
        }));
        break;
      case 'shadowsocks':
        settings.clients = clients.map((c) => ({
          password: c.password,
          email: c.email,
          level: c.level,
          method: c.method,
        }));
        break;
      case 'socks':
      case 'http':
        settings.accounts = clients.map((c) => ({
          user: c.email,
          pass: c.password,
        }));
        break;
    }

    return settings;
  }
}
