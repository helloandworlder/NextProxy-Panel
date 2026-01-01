import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockPrismaService = {
    client: { findFirst: jest.fn() },
    inbound: { findMany: jest.fn() },
  };

  const mockInbounds = [
    {
      tag: 'vless-tcp',
      protocol: 'vless',
      port: 443,
      settings: '{"decryption":"none"}',
      streamSettings: JSON.stringify({ network: 'tcp', security: 'tls', tlsSettings: { serverName: 'example.com' } }),
      enable: true,
      node: { name: 'US-Node', publicIp: '1.2.3.4', countryName: 'United States', status: 'online' },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockClient = {
    subId: 'test-sub-id',
    email: 'test@example.com',
    uuid: 'test-uuid',
    password: null,
    flow: 'xtls-rprx-vision',
    alterId: 0,
    security: 'auto',
    method: null,
    enable: true,
    expiryTime: BigInt(0),
    totalBytes: BigInt(0),
    usedBytes: BigInt(0),
    inboundTags: ['vless-tcp'],
  };

  describe('getSubscription', () => {
    it('should throw NotFoundException for invalid subId', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(null);
      await expect(service.getSubscription('invalid', 'clash')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for expired subscription', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue({
        ...mockClient,
        expiryTime: BigInt(1000), // Expired
      });
      await expect(service.getSubscription('test-sub-id', 'clash')).rejects.toThrow('Subscription expired');
    });

    it('should throw NotFoundException for exceeded quota', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue({
        ...mockClient,
        totalBytes: BigInt(1000),
        usedBytes: BigInt(1000),
      });
      await expect(service.getSubscription('test-sub-id', 'clash')).rejects.toThrow('Traffic quota exceeded');
    });

    it('should generate Clash config', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.inbound.findMany.mockResolvedValue(mockInbounds);
      const result = await service.getSubscription('test-sub-id', 'clash');
      expect(result).toContain('proxies:');
      expect(result).toContain('proxy-groups:');
    });

    it('should generate V2ray links', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.inbound.findMany.mockResolvedValue(mockInbounds);
      const result = await service.getSubscription('test-sub-id', 'v2ray');
      // V2ray format is base64 encoded
      const decoded = Buffer.from(result, 'base64').toString();
      expect(decoded).toContain('vless://');
    });

    it('should generate Singbox config', async () => {
      mockPrismaService.client.findFirst.mockResolvedValue(mockClient);
      mockPrismaService.inbound.findMany.mockResolvedValue(mockInbounds);
      const result = await service.getSubscription('test-sub-id', 'singbox');
      const config = JSON.parse(result);
      expect(config.outbounds).toBeDefined();
      expect(config.inbounds).toBeDefined();
    });
  });
});
