/**
 * XrayConfigBuilder - Core service for building Xray configurations
 * 3x-ui style: Pure JSON passthrough with structured DTO input
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================
// Xray Config Types
// ============================================

export interface XrayConfig {
  log: XrayLogConfig;
  api: XrayApiConfig;
  stats: Record<string, never>;
  inbounds: XrayInboundConfig[];
  outbounds: XrayOutboundConfig[];
  routing: XrayRoutingConfig;
  dns?: XrayDnsConfig;
  policy: XrayPolicyConfig;
}

export interface XrayLogConfig {
  loglevel: string;
  access?: string;
  error?: string;
}

export interface XrayApiConfig {
  tag: string;
  services: string[];
}

export interface XrayInboundConfig {
  tag: string;
  protocol: string;
  port: number;
  listen: string;
  settings: Record<string, any>;
  streamSettings?: Record<string, any>;
  sniffing?: Record<string, any>;
}

export interface XrayOutboundConfig {
  tag: string;
  protocol: string;
  sendThrough?: string;
  settings?: Record<string, any>;
  streamSettings?: Record<string, any>;
  proxySettings?: Record<string, any>;
  mux?: Record<string, any>;
}

export interface XrayRoutingConfig {
  domainStrategy: string;
  rules: Record<string, any>[];
  balancers?: Record<string, any>[];
}

export interface XrayDnsConfig {
  servers?: any[];
  hosts?: Record<string, string>;
}

export interface XrayPolicyConfig {
  levels: Record<string, Record<string, any>>;
  system: Record<string, any>;
}

// ============================================
// Client Config Types
// ============================================

export interface XrayClientConfig {
  email: string;
  level: number;
  // VLESS/VMess
  id?: string;
  flow?: string;
  // Trojan
  password?: string;
  // Shadowsocks
  method?: string;
}

// ============================================
// DTO Types for building configs
// ============================================

export interface InboundBuildDto {
  tag: string;
  protocol: string;
  port: number;
  listen?: string;
  // Security
  securityType?: 'none' | 'tls' | 'reality';
  tlsServerName?: string;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  realityDest?: string;
  realityServerNames?: string[];
  realityPrivateKey?: string;
  realityPublicKey?: string;
  realityShortIds?: string[];
  // Transport
  transportType?: 'tcp' | 'ws' | 'grpc' | 'h2' | 'quic' | 'kcp';
  wsPath?: string;
  wsHost?: string;
  grpcServiceName?: string;
  h2Path?: string;
  // Sniffing
  sniffingEnabled?: boolean;
  sniffingDestOverride?: string[];
  sniffingRouteOnly?: boolean;
  // Protocol-specific
  protocolSettings?: Record<string, any>;
}

export interface OutboundBuildDto {
  tag: string;
  protocol: string;
  sendThrough?: string;
  // Security
  securityType?: 'none' | 'tls' | 'reality';
  tlsServerName?: string;
  tlsFingerprint?: string;
  // Transport
  transportType?: 'tcp' | 'ws' | 'grpc';
  wsPath?: string;
  grpcServiceName?: string;
  // Protocol-specific
  protocolSettings?: Record<string, any>;
}

export interface ClientBuildDto {
  email: string;
  level?: number;
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
}

@Injectable()
export class XrayConfigBuilder {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Build Inbound Config
  // ============================================

  buildInbound(dto: InboundBuildDto): { settings: string; streamSettings: string; sniffing: string } {
    const settings = this.buildInboundSettings(dto);
    const streamSettings = this.buildStreamSettings(dto);
    const sniffing = this.buildSniffing(dto);

    return {
      settings: JSON.stringify(settings),
      streamSettings: JSON.stringify(streamSettings),
      sniffing: JSON.stringify(sniffing),
    };
  }

  private buildInboundSettings(dto: InboundBuildDto): Record<string, any> {
    const settings: Record<string, any> = dto.protocolSettings || {};

    // Protocol-specific defaults
    switch (dto.protocol) {
      case 'vless':
        if (!settings.decryption) settings.decryption = 'none';
        if (!settings.clients) settings.clients = [];
        break;
      case 'vmess':
        if (!settings.clients) settings.clients = [];
        break;
      case 'trojan':
        if (!settings.clients) settings.clients = [];
        break;
      case 'shadowsocks':
        if (!settings.clients) settings.clients = [];
        break;
      case 'socks':
        if (!settings.auth) settings.auth = 'password';
        if (!settings.accounts) settings.accounts = [];
        settings.udp = settings.udp ?? true;
        break;
      case 'http':
        if (!settings.accounts) settings.accounts = [];
        break;
    }

    return settings;
  }

  private buildStreamSettings(dto: InboundBuildDto): Record<string, any> {
    const stream: Record<string, any> = {
      network: dto.transportType || 'tcp',
    };

    // Security
    if (dto.securityType === 'tls') {
      stream.security = 'tls';
      stream.tlsSettings = {
        serverName: dto.tlsServerName || '',
        certificates: dto.tlsCertPath
          ? [{ certificateFile: dto.tlsCertPath, keyFile: dto.tlsKeyPath }]
          : [],
      };
    } else if (dto.securityType === 'reality') {
      stream.security = 'reality';
      stream.realitySettings = {
        show: false,
        dest: dto.realityDest || '',
        xver: 0,
        serverNames: dto.realityServerNames || [],
        privateKey: dto.realityPrivateKey || '',
        shortIds: dto.realityShortIds || [''],
      };
    }

    // Transport
    switch (dto.transportType) {
      case 'ws':
        stream.wsSettings = {
          path: dto.wsPath || '/',
          headers: dto.wsHost ? { Host: dto.wsHost } : {},
        };
        break;
      case 'grpc':
        stream.grpcSettings = {
          serviceName: dto.grpcServiceName || '',
          multiMode: false,
        };
        break;
      case 'h2':
        stream.httpSettings = {
          path: dto.h2Path || '/',
          host: [],
        };
        break;
    }

    return stream;
  }

  private buildSniffing(dto: InboundBuildDto): Record<string, any> {
    return {
      enabled: dto.sniffingEnabled ?? true,
      destOverride: dto.sniffingDestOverride || ['http', 'tls'],
      routeOnly: dto.sniffingRouteOnly ?? false,
    };
  }

  // ============================================
  // Build Outbound Config
  // ============================================

  buildOutbound(dto: OutboundBuildDto): { settings: string; streamSettings: string } {
    const settings = dto.protocolSettings || {};
    const streamSettings = this.buildOutboundStreamSettings(dto);

    return {
      settings: JSON.stringify(settings),
      streamSettings: JSON.stringify(streamSettings),
    };
  }

  private buildOutboundStreamSettings(dto: OutboundBuildDto): Record<string, any> {
    const stream: Record<string, any> = {
      network: dto.transportType || 'tcp',
    };

    if (dto.securityType === 'tls') {
      stream.security = 'tls';
      stream.tlsSettings = {
        serverName: dto.tlsServerName || '',
        fingerprint: dto.tlsFingerprint || 'chrome',
      };
    }

    switch (dto.transportType) {
      case 'ws':
        stream.wsSettings = { path: dto.wsPath || '/' };
        break;
      case 'grpc':
        stream.grpcSettings = { serviceName: dto.grpcServiceName || '' };
        break;
    }

    return stream;
  }

  // ============================================
  // Build Client Config (for injection into inbound.settings.clients)
  // ============================================

  buildClient(dto: ClientBuildDto): XrayClientConfig {
    const client: XrayClientConfig = {
      email: dto.email,
      level: dto.level || 0,
    };

    if (dto.uuid) {
      client.id = dto.uuid;
      if (dto.flow) client.flow = dto.flow;
    } else if (dto.password) {
      client.password = dto.password;
      if (dto.method) client.method = dto.method;
    }

    return client;
  }
}
