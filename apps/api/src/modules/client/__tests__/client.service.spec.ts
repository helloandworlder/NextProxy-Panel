import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClientServiceV3 } from '../client.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { XrayConfigBuilder } from '../../../common/xray';
import {
  createMockPrismaService,
  createMockRedisService,
  createMockXrayConfigBuilder,
} from '../../../../test/helpers/mock-factory';
import { createTestClient, createTestInbound } from '../../../../test/helpers/test-data-factory';

describe('ClientServiceV3', () => {
  let service: ClientServiceV3;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;
  let configBuilder: ReturnType<typeof createMockXrayConfigBuilder>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    configBuilder = createMockXrayConfigBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientServiceV3,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: XrayConfigBuilder, useValue: configBuilder },
      ],
    }).compile();

    service = module.get<ClientServiceV3>(ClientServiceV3);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create client with generated UUID', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      const mockClient = createTestClient({ tenantId, email: 'new@example.com' });
      prisma.client.create.mockResolvedValue(mockClient);

      const result = await service.create(tenantId, { email: 'new@example.com' });

      expect(result.email).toBe('new@example.com');
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            email: 'new@example.com',
            uuid: expect.any(String),
          }),
        }),
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      prisma.client.findFirst.mockResolvedValue(createTestClient({ email: 'existing@example.com' }));

      await expect(
        service.create(tenantId, { email: 'existing@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use provided UUID if given', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      const customUuid = 'custom-uuid-123';
      prisma.client.create.mockResolvedValue(createTestClient({ uuid: customUuid }));

      await service.create(tenantId, { email: 'test@example.com', uuid: customUuid });

      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ uuid: customUuid }),
        }),
      );
    });

    it('should sync client to inbounds if inboundTags provided', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      const mockClient = createTestClient({ inboundTags: ['vless-in'] });
      prisma.client.create.mockResolvedValue(mockClient);
      prisma.inbound.findMany.mockResolvedValue([createTestInbound({ tag: 'vless-in' })]);
      prisma.$transaction.mockResolvedValue([{}]);
      prisma.inbound.update.mockResolvedValue({});

      await service.create(tenantId, { email: 'test@example.com', inboundTags: ['vless-in'] });

      expect(prisma.inbound.findMany).toHaveBeenCalled();
      expect(redis.invalidateNodeCache).toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple clients with random emails (method 0)', async () => {
      prisma.client.createMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkCreate(tenantId, {
        emailMethod: 0,
        quantity: 3,
      });

      expect(result.created).toBe(3);
      expect(prisma.client.createMany).toHaveBeenCalled();
    });

    it('should create clients with prefix (method 1)', async () => {
      prisma.client.createMany.mockResolvedValue({ count: 2 });

      await service.bulkCreate(tenantId, {
        emailMethod: 1,
        emailPrefix: 'user_',
        quantity: 2,
      });

      expect(prisma.client.createMany).toHaveBeenCalled();
    });

    it('should create clients with prefix and number (method 4)', async () => {
      prisma.client.createMany.mockResolvedValue({ count: 3 });

      await service.bulkCreate(tenantId, {
        emailMethod: 4,
        emailPrefix: 'user',
        emailPostfix: '@test.com',
        firstNum: 1,
        lastNum: 3,
      });

      expect(prisma.client.createMany).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all clients for tenant', async () => {
      const clients = [createTestClient(), createTestClient()];
      prisma.client.findMany.mockResolvedValue(clients);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by subId', async () => {
      prisma.client.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { subId: 'sub-001' });

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, subId: 'sub-001' },
        }),
      );
    });

    it('should filter by enable status', async () => {
      prisma.client.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { enable: true });

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, enable: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return client by id', async () => {
      const mockClient = createTestClient({ id: 'client-001' });
      prisma.client.findFirst.mockResolvedValue(mockClient);

      const result = await service.findOne(tenantId, 'client-001');

      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException if client not found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return client by email', async () => {
      const mockClient = createTestClient({ email: 'test@example.com' });
      prisma.client.findFirst.mockResolvedValue(mockClient);

      const result = await service.findByEmail(tenantId, 'test@example.com');

      expect(result.email).toBe('test@example.com');
    });
  });

  describe('update', () => {
    it('should update client', async () => {
      const existing = createTestClient({ id: 'client-001', inboundTags: [] });
      prisma.client.findFirst.mockResolvedValue(existing);
      prisma.client.update.mockResolvedValue({ ...existing, remark: 'Updated' });

      const result = await service.update(tenantId, 'client-001', { remark: 'Updated' });

      expect(result.remark).toBe('Updated');
    });

    it('should sync to inbounds when inboundTags change', async () => {
      const existing = createTestClient({ id: 'client-001', inboundTags: ['old-tag'] });
      prisma.client.findFirst.mockResolvedValue(existing);
      prisma.client.update.mockResolvedValue({ ...existing, inboundTags: ['new-tag'] });
      prisma.inbound.findMany.mockResolvedValue([]);

      await service.update(tenantId, 'client-001', { inboundTags: ['new-tag'] });

      expect(prisma.inbound.findMany).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete client and remove from inbounds', async () => {
      const existing = createTestClient({ id: 'client-001', inboundTags: ['vless-in'] });
      prisma.client.findFirst.mockResolvedValue(existing);
      prisma.inbound.findMany.mockResolvedValue([]);
      prisma.client.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'client-001');

      expect(prisma.client.delete).toHaveBeenCalledWith({ where: { id: 'client-001' } });
    });
  });

  describe('resetTraffic', () => {
    it('should reset usedBytes to 0', async () => {
      const existing = createTestClient({ id: 'client-001' });
      prisma.client.findFirst.mockResolvedValue(existing);
      prisma.client.update.mockResolvedValue({ ...existing, usedBytes: BigInt(0) });

      await service.resetTraffic(tenantId, 'client-001');

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: 'client-001' },
        data: { usedBytes: BigInt(0) },
      });
    });
  });

  describe('getStats', () => {
    it('should return client stats', async () => {
      prisma.clientStats.findMany.mockResolvedValue([]);

      await service.getStats(tenantId, 'client-001');

      expect(prisma.clientStats.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-001' },
        include: { node: true, inbound: true },
      });
    });
  });

  describe('IP Tracking', () => {
    describe('getClientIps', () => {
      it('should return client IP logs', async () => {
        const mockClient = createTestClient({ id: 'client-001' });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.clientIpLog.findMany.mockResolvedValue([
          { ip: '192.168.1.1', lastSeenAt: new Date() },
        ]);

        const result = await service.getClientIps(tenantId, 'client-001');

        expect(result).toHaveLength(1);
        expect(prisma.clientIpLog.findMany).toHaveBeenCalledWith({
          where: { clientId: 'client-001' },
          orderBy: { lastSeenAt: 'desc' },
        });
      });
    });

    describe('logClientIp', () => {
      it('should log new IP connection', async () => {
        const mockClient = createTestClient({ id: 'client-001', limitIp: 0 });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.clientIpLog.upsert.mockResolvedValue({});

        await service.logClientIp(tenantId, 'client-001', '192.168.1.1');

        expect(prisma.clientIpLog.upsert).toHaveBeenCalled();
      });

      it('should throw BadRequestException when IP limit exceeded', async () => {
        const mockClient = createTestClient({ id: 'client-001', limitIp: 2 });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.clientIpLog.count.mockResolvedValue(2);
        prisma.clientIpLog.findFirst.mockResolvedValue(null); // New IP

        await expect(
          service.logClientIp(tenantId, 'client-001', '192.168.1.100'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should allow existing IP even at limit', async () => {
        const mockClient = createTestClient({ id: 'client-001', limitIp: 2 });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.clientIpLog.count.mockResolvedValue(2);
        prisma.clientIpLog.findFirst.mockResolvedValue({ ip: '192.168.1.1' }); // Existing IP
        prisma.clientIpLog.upsert.mockResolvedValue({});

        await service.logClientIp(tenantId, 'client-001', '192.168.1.1');

        expect(prisma.clientIpLog.upsert).toHaveBeenCalled();
      });

      it('should set firstConnectAt for delayed start clients', async () => {
        const mockClient = createTestClient({
          id: 'client-001',
          delayedStart: true,
          firstConnectAt: null,
        });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.client.update.mockResolvedValue({});
        prisma.clientIpLog.upsert.mockResolvedValue({});

        await service.logClientIp(tenantId, 'client-001', '192.168.1.1');

        expect(prisma.client.update).toHaveBeenCalledWith({
          where: { id: 'client-001' },
          data: { firstConnectAt: expect.any(Date) },
        });
      });
    });

    describe('clearClientIps', () => {
      it('should clear all IP logs for client', async () => {
        const mockClient = createTestClient({ id: 'client-001' });
        prisma.client.findFirst.mockResolvedValue(mockClient);
        prisma.clientIpLog.deleteMany.mockResolvedValue({ count: 5 });

        await service.clearClientIps(tenantId, 'client-001');

        expect(prisma.clientIpLog.deleteMany).toHaveBeenCalledWith({
          where: { clientId: 'client-001' },
        });
      });
    });

    describe('getOnlineClients', () => {
      it('should return clients with active IPs', async () => {
        const mockClients = [
          createTestClient({
            id: 'client-001',
            email: 'active@test.com',
            clientIpLogs: [{ ip: '1.1.1.1', lastSeenAt: new Date() }],
          }),
          createTestClient({
            id: 'client-002',
            email: 'inactive@test.com',
            clientIpLogs: [],
          }),
        ];
        prisma.client.findMany.mockResolvedValue(mockClients);

        const result = await service.getOnlineClients(tenantId);

        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('active@test.com');
      });
    });
  });
});
