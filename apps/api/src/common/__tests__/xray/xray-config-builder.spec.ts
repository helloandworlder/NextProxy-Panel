import { Test, TestingModule } from '@nestjs/testing';
import { XrayConfigBuilder } from '../../xray/xray-config-builder';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../../test/helpers/mock-factory';

describe('XrayConfigBuilder', () => {
  let builder: XrayConfigBuilder;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XrayConfigBuilder,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    builder = module.get<XrayConfigBuilder>(XrayConfigBuilder);
  });

  describe('buildInbound', () => {
    describe('VLESS Protocol', () => {
      it('should build VLESS + TCP + TLS inbound', () => {
        const result = builder.buildInbound({
          tag: 'vless-tcp-tls',
          protocol: 'vless',
          port: 443,
          securityType: 'tls',
          tlsServerName: 'example.com',
          tlsCertPath: '/path/cert.pem',
          tlsKeyPath: '/path/key.pem',
          transportType: 'tcp',
        });

        const settings = JSON.parse(result.settings);
        const stream = JSON.parse(result.streamSettings);

        expect(settings.decryption).toBe('none');
        expect(stream.security).toBe('tls');
        expect(stream.network).toBe('tcp');
        expect(stream.tlsSettings.serverName).toBe('example.com');
      });

      it('should build VLESS + WS + TLS inbound', () => {
        const result = builder.buildInbound({
          tag: 'vless-ws-tls',
          protocol: 'vless',
          port: 443,
          securityType: 'tls',
          transportType: 'ws',
          wsPath: '/ws',
          wsHost: 'example.com',
        });

        const stream = JSON.parse(result.streamSettings);

        expect(stream.network).toBe('ws');
        expect(stream.wsSettings.path).toBe('/ws');
        expect(stream.wsSettings.headers.Host).toBe('example.com');
      });

      it('should build VLESS + gRPC + TLS inbound', () => {
        const result = builder.buildInbound({
          tag: 'vless-grpc-tls',
          protocol: 'vless',
          port: 443,
          securityType: 'tls',
          transportType: 'grpc',
          grpcServiceName: 'grpc-service',
        });

        const stream = JSON.parse(result.streamSettings);

        expect(stream.network).toBe('grpc');
        expect(stream.grpcSettings.serviceName).toBe('grpc-service');
      });

      it('should build VLESS + TCP + Reality inbound', () => {
        const result = builder.buildInbound({
          tag: 'vless-reality',
          protocol: 'vless',
          port: 443,
          securityType: 'reality',
          realityDest: 'www.microsoft.com:443',
          realityServerNames: ['www.microsoft.com'],
          realityPrivateKey: 'private-key',
          realityShortIds: ['abc123'],
        });

        const stream = JSON.parse(result.streamSettings);

        expect(stream.security).toBe('reality');
        expect(stream.realitySettings.dest).toBe('www.microsoft.com:443');
        expect(stream.realitySettings.serverNames).toContain('www.microsoft.com');
        expect(stream.realitySettings.privateKey).toBe('private-key');
      });

      it('should build VLESS + H2 inbound', () => {
        const result = builder.buildInbound({
          tag: 'vless-h2',
          protocol: 'vless',
          port: 443,
          transportType: 'h2',
          h2Path: '/h2',
        });

        const stream = JSON.parse(result.streamSettings);

        expect(stream.network).toBe('h2');
        expect(stream.httpSettings.path).toBe('/h2');
      });
    });

    describe('VMess Protocol', () => {
      it('should build VMess + WS + TLS inbound', () => {
        const result = builder.buildInbound({
          tag: 'vmess-ws-tls',
          protocol: 'vmess',
          port: 443,
          securityType: 'tls',
          transportType: 'ws',
          wsPath: '/vmess',
        });

        const settings = JSON.parse(result.settings);
        expect(settings.clients).toEqual([]);
      });

      it('should build VMess + TCP + None inbound', () => {
        const result = builder.buildInbound({
          tag: 'vmess-tcp',
          protocol: 'vmess',
          port: 443,
          transportType: 'tcp',
        });

        const stream = JSON.parse(result.streamSettings);
        expect(stream.network).toBe('tcp');
        expect(stream.security).toBeUndefined();
      });
    });

    describe('Trojan Protocol', () => {
      it('should build Trojan + TCP + TLS inbound', () => {
        const result = builder.buildInbound({
          tag: 'trojan-tcp-tls',
          protocol: 'trojan',
          port: 443,
          securityType: 'tls',
          tlsServerName: 'example.com',
        });

        const settings = JSON.parse(result.settings);
        expect(settings.clients).toEqual([]);
      });
    });

    describe('Socks5 Protocol', () => {
      it('should build Socks5 inbound with auth', () => {
        const result = builder.buildInbound({
          tag: 'socks5-in',
          protocol: 'socks',
          port: 1080,
        });

        const settings = JSON.parse(result.settings);
        expect(settings.auth).toBe('password');
        expect(settings.udp).toBe(true);
      });
    });

    describe('HTTP Protocol', () => {
      it('should build HTTP proxy inbound', () => {
        const result = builder.buildInbound({
          tag: 'http-in',
          protocol: 'http',
          port: 8080,
        });

        const settings = JSON.parse(result.settings);
        expect(settings.accounts).toEqual([]);
      });
    });

    describe('Sniffing', () => {
      it('should set default sniffing config', () => {
        const result = builder.buildInbound({
          tag: 'test',
          protocol: 'vless',
          port: 443,
        });

        const sniffing = JSON.parse(result.sniffing);
        expect(sniffing.enabled).toBe(true);
        expect(sniffing.destOverride).toContain('http');
        expect(sniffing.destOverride).toContain('tls');
      });

      it('should allow custom sniffing config', () => {
        const result = builder.buildInbound({
          tag: 'test',
          protocol: 'vless',
          port: 443,
          sniffingEnabled: false,
          sniffingDestOverride: ['quic'],
          sniffingRouteOnly: true,
        });

        const sniffing = JSON.parse(result.sniffing);
        expect(sniffing.enabled).toBe(false);
        expect(sniffing.destOverride).toEqual(['quic']);
        expect(sniffing.routeOnly).toBe(true);
      });
    });
  });

  describe('buildOutbound', () => {
    it('should build Freedom outbound', () => {
      const result = builder.buildOutbound({
        tag: 'direct',
        protocol: 'freedom',
      });

      const stream = JSON.parse(result.streamSettings);
      expect(stream.network).toBe('tcp');
    });

    it('should build outbound with TLS', () => {
      const result = builder.buildOutbound({
        tag: 'proxy-out',
        protocol: 'vless',
        securityType: 'tls',
        tlsServerName: 'proxy.example.com',
        tlsFingerprint: 'chrome',
      });

      const stream = JSON.parse(result.streamSettings);
      expect(stream.security).toBe('tls');
      expect(stream.tlsSettings.serverName).toBe('proxy.example.com');
      expect(stream.tlsSettings.fingerprint).toBe('chrome');
    });

    it('should build outbound with WS transport', () => {
      const result = builder.buildOutbound({
        tag: 'proxy-out',
        protocol: 'vless',
        transportType: 'ws',
        wsPath: '/ws',
      });

      const stream = JSON.parse(result.streamSettings);
      expect(stream.network).toBe('ws');
      expect(stream.wsSettings.path).toBe('/ws');
    });

    it('should build outbound with gRPC transport', () => {
      const result = builder.buildOutbound({
        tag: 'proxy-out',
        protocol: 'vless',
        transportType: 'grpc',
        grpcServiceName: 'grpc-service',
      });

      const stream = JSON.parse(result.streamSettings);
      expect(stream.network).toBe('grpc');
      expect(stream.grpcSettings.serviceName).toBe('grpc-service');
    });
  });

  describe('buildClient', () => {
    it('should build VLESS client with flow', () => {
      const result = builder.buildClient({
        email: 'user@example.com',
        uuid: 'test-uuid',
        flow: 'xtls-rprx-vision',
        level: 1,
      });

      expect(result.email).toBe('user@example.com');
      expect(result.id).toBe('test-uuid');
      expect(result.flow).toBe('xtls-rprx-vision');
      expect(result.level).toBe(1);
    });

    it('should build VMess client', () => {
      const result = builder.buildClient({
        email: 'user@example.com',
        uuid: 'test-uuid',
      });

      expect(result.id).toBe('test-uuid');
      expect(result.flow).toBeUndefined();
    });

    it('should build Trojan client', () => {
      const result = builder.buildClient({
        email: 'user@example.com',
        password: 'secret-password',
      });

      expect(result.password).toBe('secret-password');
      expect(result.id).toBeUndefined();
    });

    it('should build Shadowsocks client', () => {
      const result = builder.buildClient({
        email: 'user@example.com',
        password: 'secret',
        method: 'aes-256-gcm',
      });

      expect(result.password).toBe('secret');
      expect(result.method).toBe('aes-256-gcm');
    });

    it('should use default level 0', () => {
      const result = builder.buildClient({
        email: 'user@example.com',
        uuid: 'test-uuid',
      });

      expect(result.level).toBe(0);
    });
  });
});
