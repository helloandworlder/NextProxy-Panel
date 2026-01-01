import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OutboundService } from '../outbound.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { OutboundValidator } from '../../../common/validators/outbound.validator';
import {
  createMockPrismaService,
  createMockRedisService,
  createMockOutboundValidator,
} from '../../../../test/helpers/mock-factory';
import {
  createTestOutbound,
  createBlackholeOutbound,
  createProxyOutbound,
} from '../../../../test/helpers/test-data-factory';

describe('OutboundService', () => {
  let service: OutboundService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;
  let validator: ReturnType<typeof createMockOutboundValidator>;

  const tenantId = 'tenant-001';
  const nodeId = 'node-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    validator = createMockOutboundValidator();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: OutboundValidator, useValue: validator },
      ],
    }).compile();

    service = module.get<OutboundService>(OutboundService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create freedom outbound', async () => {
      const mockOutbound = createTestOutbound({ nodeId });
      prisma.outbound.create.mockResolvedValue(mockOutbound);

      const result = await service.create(tenantId, {
        nodeId,
        tag: 'direct',
        protocol: 'freedom',
        settings: { domainStrategy: 'AsIs' },
      });

      expect(result.protocol).toBe('freedom');
      expect(validator.validate).toHaveBeenCalled();
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should create blackhole outbound', async () => {
      const mockOutbound = createBlackholeOutbound({ nodeId });
      prisma.outbound.create.mockResolvedValue(mockOutbound);

      const result = await service.create(tenantId, {
        nodeId,
        tag: 'block',
        protocol: 'blackhole',
        settings: { response: { type: 'http' } },
      });

      expect(result.protocol).toBe('blackhole');
    });

    it('should create VLESS proxy outbound', async () => {
      const mockOutbound = createProxyOutbound({ nodeId });
      prisma.outbound.create.mockResolvedValue(mockOutbound);

      await service.create(tenantId, {
        nodeId,
        tag: 'proxy-out',
        protocol: 'vless',
        settings: {
          vnext: [{ address: 'proxy.example.com', port: 443, users: [{ id: 'uuid' }] }],
        },
        streamSettings: { network: 'ws', security: 'tls' },
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'vless' }),
        }),
      );
    });

    it('should throw BadRequestException on validation failure', async () => {
      validator.validate.mockResolvedValue({
        valid: false,
        errors: ['Invalid configuration'],
        warnings: [],
      });

      await expect(
        service.create(tenantId, { nodeId, tag: 'invalid', protocol: 'freedom' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create outbound with egress IP binding', async () => {
      const mockOutbound = createTestOutbound({ nodeId, egressIpId: 'egress-001' });
      prisma.outbound.create.mockResolvedValue(mockOutbound);

      await service.create(tenantId, {
        nodeId,
        tag: 'direct-egress',
        protocol: 'freedom',
        egressIpId: 'egress-001',
        sendThrough: '10.0.0.1',
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            egressIpId: 'egress-001',
            sendThrough: '10.0.0.1',
          }),
        }),
      );
    });
  });

  describe('Protocol Tests', () => {
    beforeEach(() => {
      prisma.outbound.create.mockImplementation((args) => Promise.resolve(args.data));
    });

    it('should create Socks outbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'socks-out',
        protocol: 'socks',
        settings: {
          servers: [{ address: 'proxy.example.com', port: 1080, users: [{ user: 'u', pass: 'p' }] }],
        },
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'socks' }),
        }),
      );
    });

    it('should create HTTP outbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'http-out',
        protocol: 'http',
        settings: {
          servers: [{ address: 'proxy.example.com', port: 8080 }],
        },
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'http' }),
        }),
      );
    });

    it('should create VMess outbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'vmess-out',
        protocol: 'vmess',
        settings: {
          vnext: [{ address: 'proxy.example.com', port: 443, users: [{ id: 'uuid', alterId: 0 }] }],
        },
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'vmess' }),
        }),
      );
    });

    it('should create Trojan outbound', async () => {
      await service.create(tenantId, {
        nodeId,
        tag: 'trojan-out',
        protocol: 'trojan',
        settings: {
          servers: [{ address: 'proxy.example.com', port: 443, password: 'secret' }],
        },
      });

      expect(prisma.outbound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ protocol: 'trojan' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all outbounds for tenant', async () => {
      const outbounds = [createTestOutbound(), createBlackholeOutbound()];
      prisma.outbound.findMany.mockResolvedValue(outbounds);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by nodeId', async () => {
      prisma.outbound.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, nodeId);

      expect(prisma.outbound.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, nodeId },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return outbound by id', async () => {
      const mockOutbound = createTestOutbound({ id: 'outbound-001' });
      prisma.outbound.findFirst.mockResolvedValue(mockOutbound);

      const result = await service.findOne(tenantId, 'outbound-001');

      expect(result).toEqual(mockOutbound);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.outbound.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update outbound and invalidate cache', async () => {
      const existing = createTestOutbound({ id: 'outbound-001', nodeId });
      prisma.outbound.findFirst.mockResolvedValue(existing);
      prisma.outbound.update.mockResolvedValue({ ...existing, priority: 50 });

      const result = await service.update(tenantId, 'outbound-001', { priority: 50 });

      expect(result.priority).toBe(50);
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should throw BadRequestException on validation failure', async () => {
      const existing = createTestOutbound({ id: 'outbound-001' });
      prisma.outbound.findFirst.mockResolvedValue(existing);
      validator.validate.mockResolvedValue({
        valid: false,
        errors: ['Invalid update'],
        warnings: [],
      });

      await expect(
        service.update(tenantId, 'outbound-001', { protocol: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete outbound and invalidate cache', async () => {
      const existing = createTestOutbound({ id: 'outbound-001', nodeId });
      prisma.outbound.findFirst.mockResolvedValue(existing);
      prisma.outbound.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'outbound-001');

      expect(prisma.outbound.delete).toHaveBeenCalledWith({ where: { id: 'outbound-001' } });
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });
  });
});
