import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InboundServiceV3 } from '../inbound.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { XrayConfigBuilder } from '../../../common/xray';
import {
  createMockPrismaService,
  createMockRedisService,
  createMockXrayConfigBuilder,
} from '../../../../test/helpers/mock-factory';
import {
  createTestInbound,
  createVlessRealityInbound,
  createSocks5Inbound,
} from '../../../../test/helpers/test-data-factory';

describe('InboundServiceV3', () => {
  let service: InboundServiceV3;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;
  let configBuilder: ReturnType<typeof createMockXrayConfigBuilder>;

  const tenantId = 'tenant-001';
  const nodeId = 'node-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    configBuilder = createMockXrayConfigBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundServiceV3,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: XrayConfigBuilder, useValue: configBuilder },
      ],
    }).compile();

    service = module.get<InboundServiceV3>(InboundServiceV3);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create - Raw JSON Mode', () => {
    it('should create inbound with raw JSON settings', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      const mockInbound = createTestInbound({ nodeId });
      prisma.inbound.create.mockResolvedValue(mockInbound);

      const result = await service.create(tenantId, {
        nodeId,
        tag: 'vless-tcp',
        protocol: 'vless',
        port: 443,
        settings: '{"decryption":"none"}',
        streamSettings: '{"network":"tcp"}',
      });

      expect(result).toEqual(mockInbound);
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should throw BadRequestException if port already in use', async () => {
      prisma.inbound.findFirst.mockResolvedValueOnce(createTestInbound({ port: 443 }));

      await expect(
        service.create(tenantId, { nodeId, tag: 'new-tag', protocol: 'vless', port: 443 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if tag already exists', async () => {
      prisma.inbound.findFirst
        .mockResolvedValueOnce(null) // port check
        .mockResolvedValueOnce(createTestInbound({ tag: 'existing-tag' })); // tag check

      await expect(
        service.create(tenantId, { nodeId, tag: 'existing-tag', protocol: 'vless', port: 444 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create - Structured Mode', () => {
    it('should create VLESS + TCP + TLS inbound', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      prisma.inbound.create.mockResolvedValue(createTestInbound());

      await service.create(tenantId, {
        nodeId,
        tag: 'vless-tcp-tls',
        protocol: 'vless',
        port: 443,
        securityType: 'tls',
        tlsServerName: 'example.com',
        transportType: 'tcp',
      });

      expect(configBuilder.buildInbound).toHaveBeenCalled();
      expect(prisma.inbound.create).toHaveBeenCalled();
    });

    it('should create VLESS + WS + TLS inbound', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      prisma.inbound.create.mockResolvedValue(createTestInbound());

      await service.create(tenantId, {
        nodeId,
        tag: 'vless-ws-tls',
        protocol: 'vless',
        port: 443,
        securityType: 'tls',
        transportType: 'ws',
        wsPath: '/ws',
        wsHost: 'example.com',
      });

      expect(configBuilder.buildInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          transportType: 'ws',
          wsPath: '/ws',
        }),
      );
    });

    it('should create VLESS + gRPC + TLS inbound', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      prisma.inbound.create.mockResolvedValue(createTestInbound());

      await service.create(tenantId, {
        nodeId,
        tag: 'vless-grpc-tls',
        protocol: 'vless',
        port: 443,
        securityType: 'tls',
        transportType: 'grpc',
        grpcServiceName: 'grpc-service',
      });

      expect(configBuilder.buildInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          transportType: 'grpc',
          grpcServiceName: 'grpc-service',
        }),
      );
    });

    it('should create VLESS + TCP + Reality inbound', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      prisma.inbound.create.mockResolvedValue(createVlessRealityInbound());

      await service.create(tenantId, {
        nodeId,
        tag: 'vless-reality',
        protocol: 'vless',
        port: 443,
        securityType: 'reality',
        realityDest: 'www.microsoft.com:443',
        realityServerNames: ['www.microsoft.com'],
        realityPrivateKey: 'private-key',
        realityShortIds: [''],
      });

      expect(configBuilder.buildInbound).toHaveBeenCalledWith(
        expect.objectContaining({
          securityType: 'reality',
          realityDest: 'www.microsoft.com:443',
        }),
      );
    });
  });

  describe('Protocol Tests', () => {
    beforeEach(() => {
      prisma.inbound.findFirst.mockResolvedValue(null);
      prisma.inbound.create.mockImplementation((args) => Promise.resolve(args.data));
    });

    it('should create VMess + WS + TLS inbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'vmess-ws-tls',
        protocol: 'vmess',
        port: 443,
        securityType: 'tls',
        transportType: 'ws',
        wsPath: '/vmess',
      });

      expect(prisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'vmess' }),
        }),
      );
    });

    it('should create Trojan + TCP + TLS inbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'trojan-tcp-tls',
        protocol: 'trojan',
        port: 443,
        securityType: 'tls',
        tlsServerName: 'example.com',
      });

      expect(prisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'trojan' }),
        }),
      );
    });

    it('should create Socks5 inbound with auth', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'socks5-auth',
        protocol: 'socks',
        port: 1080,
        settings: '{"auth":"password","accounts":[],"udp":true}',
      });

      expect(prisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'socks', port: 1080 }),
        }),
      );
    });

    it('should create HTTP proxy inbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'http-proxy',
        protocol: 'http',
        port: 8080,
        settings: '{"accounts":[]}',
      });

      expect(prisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'http', port: 8080 }),
        }),
      );
    });

    it('should create Shadowsocks inbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'ss-in',
        protocol: 'shadowsocks',
        port: 8388,
        settings: '{"method":"aes-256-gcm","password":"secret"}',
      });

      expect(prisma.inbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'shadowsocks' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all inbounds for tenant', async () => {
      const inbounds = [createTestInbound(), createSocks5Inbound()];
      prisma.inbound.findMany.mockResolvedValue(inbounds);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by nodeId', async () => {
      prisma.inbound.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, nodeId);

      expect(prisma.inbound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, nodeId },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return inbound by id', async () => {
      const mockInbound = createTestInbound({ id: 'inbound-001' });
      prisma.inbound.findFirst.mockResolvedValue(mockInbound);

      const result = await service.findOne(tenantId, 'inbound-001');

      expect(result).toEqual(mockInbound);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.inbound.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update inbound and invalidate cache', async () => {
      const existing = createTestInbound({ id: 'inbound-001', nodeId, port: 443 });
      prisma.inbound.findFirst
        .mockResolvedValueOnce(existing) // findOne
        .mockResolvedValueOnce(null); // port check - no conflict
      prisma.inbound.update.mockResolvedValue({ ...existing, port: 8443 });

      const result = await service.update(tenantId, 'inbound-001', { port: 8443 });

      expect(result.port).toBe(8443);
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should throw BadRequestException if new port already in use', async () => {
      const existing = createTestInbound({ id: 'inbound-001', port: 443 });
      prisma.inbound.findFirst
        .mockResolvedValueOnce(existing) // findOne
        .mockResolvedValueOnce(createTestInbound({ port: 8443 })); // port check

      await expect(
        service.update(tenantId, 'inbound-001', { port: 8443 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete inbound and invalidate cache', async () => {
      const existing = createTestInbound({ id: 'inbound-001', nodeId });
      prisma.inbound.findFirst.mockResolvedValue(existing);
      prisma.inbound.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'inbound-001');

      expect(prisma.inbound.delete).toHaveBeenCalledWith({ where: { id: 'inbound-001' } });
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });
  });

  describe('findOneParsed', () => {
    it('should return inbound with parsed JSON fields', async () => {
      const mockInbound = createTestInbound({
        settings: '{"decryption":"none"}',
        streamSettings: '{"network":"tcp"}',
        sniffing: '{"enabled":true}',
      });
      prisma.inbound.findFirst.mockResolvedValue(mockInbound);

      const result = await service.findOneParsed(tenantId, 'inbound-001');

      expect(result.settingsParsed).toEqual({ decryption: 'none' });
      expect(result.streamSettingsParsed).toEqual({ network: 'tcp' });
      expect(result.sniffingParsed).toEqual({ enabled: true });
    });
  });
});
