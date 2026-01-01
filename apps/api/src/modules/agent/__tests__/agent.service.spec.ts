import { Test, TestingModule } from '@nestjs/testing';
import { AgentServiceV3 } from '../agent.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { XrayNodeConfigBuilder } from '../../../common/xray';
import {
  createMockPrismaService,
  createMockRedisService,
} from '../../../../test/helpers/mock-factory';
import { createTestNode, createTestClient } from '../../../../test/helpers/test-data-factory';

describe('AgentServiceV3', () => {
  let service: AgentServiceV3;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;

  const nodeId = 'node-001';
  const tenantId = 'tenant-001';

  const mockConfigBuilder = {
    buildNodeConfig: jest.fn().mockResolvedValue({
      log: { loglevel: 'warning' },
      inbounds: [{ tag: 'vless-in', settings: {} }],
      outbounds: [{ tag: 'direct', protocol: 'freedom' }],
      routing: { rules: [] },
    }),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    redis.getConfigEtag = jest.fn().mockResolvedValue(null);
    redis.setConfigEtag = jest.fn().mockResolvedValue(undefined);
    redis.getUsersEtag = jest.fn().mockResolvedValue(null);
    redis.setUsersEtag = jest.fn().mockResolvedValue(undefined);
    redis.incrTraffic = jest.fn().mockResolvedValue(undefined);
    redis.pushTraffic = jest.fn().mockResolvedValue(undefined);
    redis.recordBandwidthSample = jest.fn().mockResolvedValue(undefined);
    redis.setNodeStatus = jest.fn().mockResolvedValue(undefined);
    redis.updateOnlineUser = jest.fn().mockResolvedValue(undefined);
    redis.addDeviceOnline = jest.fn().mockResolvedValue(undefined);
    redis.countDevicesOnline = jest.fn().mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentServiceV3,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: XrayNodeConfigBuilder, useValue: mockConfigBuilder },
      ],
    }).compile();

    service = module.get<AgentServiceV3>(AgentServiceV3);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getNodeConfig', () => {
    it('should return notModified when ETag matches', async () => {
      redis.getConfigEtag.mockResolvedValue('cached-etag');

      const result = await service.getNodeConfig(nodeId, 'cached-etag');

      expect(result.notModified).toBe(true);
      expect(result.config).toBeNull();
    });

    it('should build and return config when ETag differs', async () => {
      redis.getConfigEtag.mockResolvedValue('old-etag');
      prisma.inbound.findMany.mockResolvedValue([]);
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.client.findMany.mockResolvedValue([]);

      const result = await service.getNodeConfig(nodeId, 'different-etag');

      expect(result.notModified).toBe(false);
      expect(result.config).toBeDefined();
      expect(result.etag).toBeDefined();
    });

    it('should inject clients into inbound settings', async () => {
      redis.getConfigEtag.mockResolvedValue(null);
      prisma.inbound.findMany.mockResolvedValue([
        { tag: 'vless-in', protocol: 'vless' },
      ]);
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.client.findMany.mockResolvedValue([
        createTestClient({ email: 'user@test.com', uuid: 'uuid-1', inboundTags: ['vless-in'] }),
      ]);

      await service.getNodeConfig(nodeId);

      expect(mockConfigBuilder.buildNodeConfig).toHaveBeenCalledWith(nodeId);
    });
  });

  describe('getNodeUsers', () => {
    it('should return notModified when ETag matches', async () => {
      redis.getUsersEtag.mockResolvedValue('cached-etag');

      const result = await service.getNodeUsers(nodeId, 'cached-etag');

      expect(result.notModified).toBe(true);
      expect(result.users).toBeNull();
    });

    it('should return users list with rate limits', async () => {
      redis.getUsersEtag.mockResolvedValue(null);
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.inbound.findMany.mockResolvedValue([{ tag: 'vless-in' }]);
      prisma.client.findMany.mockResolvedValue([
        createTestClient({
          email: 'user@test.com',
          uuid: 'uuid-1',
          inboundTags: ['vless-in'],
          uploadLimit: BigInt(1000000),
          downloadLimit: BigInt(2000000),
        }),
      ]);

      const result = await service.getNodeUsers(nodeId);

      expect(result.users).toHaveLength(1);
      expect(result.rateLimits).toHaveLength(1);
      expect(result.rateLimits![0].uploadBytesPerSec).toBe(1000000);
    });

    it('should filter expired clients', async () => {
      redis.getUsersEtag.mockResolvedValue(null);
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.inbound.findMany.mockResolvedValue([{ tag: 'vless-in' }]);
      prisma.client.findMany.mockResolvedValue([
        createTestClient({
          email: 'expired@test.com',
          expiryTime: BigInt(1000), // Expired
          inboundTags: ['vless-in'],
        }),
      ]);

      const result = await service.getNodeUsers(nodeId);

      expect(result.users).toHaveLength(0);
    });

    it('should filter clients exceeding quota', async () => {
      redis.getUsersEtag.mockResolvedValue(null);
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.inbound.findMany.mockResolvedValue([{ tag: 'vless-in' }]);
      prisma.client.findMany.mockResolvedValue([
        createTestClient({
          email: 'exceeded@test.com',
          totalBytes: BigInt(1000),
          usedBytes: BigInt(1000),
          inboundTags: ['vless-in'],
        }),
      ]);

      const result = await service.getNodeUsers(nodeId);

      expect(result.users).toHaveLength(0);
    });
  });

  describe('reportTraffic', () => {
    it('should report traffic to Redis', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.inbound.findMany.mockResolvedValue([{ id: 'inbound-1', tag: 'vless-in' }]);

      const result = await service.reportTraffic(nodeId, [
        { email: 'user@test.com', upload: 1024, download: 2048, inboundTag: 'vless-in' },
      ]);

      expect(result.success).toBe(true);
      expect(redis.incrTraffic).toHaveBeenCalled();
      expect(redis.pushTraffic).toHaveBeenCalled();
    });

    it('should record bandwidth sample', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.inbound.findMany.mockResolvedValue([]);

      await service.reportTraffic(nodeId, [
        { email: 'user@test.com', upload: 1024, download: 2048 },
      ]);

      expect(redis.recordBandwidthSample).toHaveBeenCalledWith('node', nodeId, 1024, 2048);
    });
  });

  describe('reportStatus', () => {
    it('should update node status', async () => {
      prisma.node.update.mockResolvedValue(createTestNode());

      const result = await service.reportStatus(nodeId, {
        cpuUsage: 25,
        memoryUsage: 50,
        diskUsage: 30,
        uptime: 3600,
        onlineUsers: 10,
        xrayVersion: '1.8.0',
      });

      expect(result.success).toBe(true);
      expect(redis.setNodeStatus).toHaveBeenCalled();
      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: nodeId },
        data: expect.objectContaining({
          status: 'online',
          lastSeenAt: expect.any(Date),
        }),
      });
    });
  });

  describe('reportAlive', () => {
    it('should track online users', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.client.findMany.mockResolvedValue([createTestClient({ id: 'client-1', email: 'user@test.com', deviceLimit: 0 })]);

      const result = await service.reportAlive(nodeId, [
        { email: 'user@test.com', ip: '192.168.1.1' },
      ]);

      expect(result.success).toBe(true);
      expect(redis.updateOnlineUser).toHaveBeenCalled();
      expect(redis.addDeviceOnline).toHaveBeenCalled();
    });

    it('should return kickUsers when device limit exceeded', async () => {
      prisma.node.findUnique.mockResolvedValue(createTestNode({ id: nodeId, tenantId }));
      prisma.client.findMany.mockResolvedValue([createTestClient({ id: 'client-1', email: 'user@test.com', deviceLimit: 1 })]);
      redis.countDevicesOnline.mockResolvedValue(2);

      const result = await service.reportAlive(nodeId, [
        { email: 'user@test.com', ip: '192.168.1.1' },
      ]);

      expect(result.kickUsers).toContain('user@test.com');
    });
  });

  describe('registerNode', () => {
    it('should register node and return intervals', async () => {
      prisma.node.update.mockResolvedValue(createTestNode({ id: nodeId, name: 'Test Node' }));

      const result = await service.registerNode(nodeId, {
        hostname: 'agent-host',
        os: 'linux',
        arch: 'amd64',
        publicIp: '1.2.3.4',
        xrayVersion: '1.8.0',
      });

      expect(result.nodeId).toBe(nodeId);
      expect(result.configPollInterval).toBeGreaterThan(0);
      expect(result.trafficReportInterval).toBeGreaterThan(0);
    });
  });

  describe('reportEgressIps', () => {
    it('should upsert egress IPs', async () => {
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.reportEgressIps(nodeId, [
        { ip: '10.0.0.1', version: 4, isActive: true },
        { ip: '10.0.0.2', version: 4, isActive: false },
      ]);

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
