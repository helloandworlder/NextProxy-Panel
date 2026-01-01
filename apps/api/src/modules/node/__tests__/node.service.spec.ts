import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NodeService } from '../node.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../redis/redis.service';
import {
  createMockPrismaService,
  createMockConfigService,
  createMockRedisService,
} from '../../../../test/helpers/mock-factory';
import { createTestNode } from '../../../../test/helpers/test-data-factory';

describe('NodeService', () => {
  let service: NodeService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;
  let config: ReturnType<typeof createMockConfigService>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    config = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<NodeService>(NodeService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('quickCreate', () => {
    it('should create node with generated token and install command', async () => {
      const mockNode = createTestNode({ tenantId, name: 'Quick Node' });
      prisma.node.create.mockResolvedValue(mockNode);

      const result = await service.quickCreate(tenantId, { name: 'Quick Node' });

      expect(result.name).toBe('Quick Node');
      expect(result.installCommand).toContain('curl -fsSL');
      expect(result.installCommand).toContain('--token=');
      expect(prisma.node.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            name: 'Quick Node',
            token: expect.stringMatching(/^node_/),
          }),
        }),
      );
    });

    it('should include nodeGroupId if provided', async () => {
      const mockNode = createTestNode({ tenantId, nodeGroupId: 'group-001' });
      prisma.node.create.mockResolvedValue(mockNode);

      await service.quickCreate(tenantId, { name: 'Node', nodeGroupId: 'group-001' });

      expect(prisma.node.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ nodeGroupId: 'group-001' }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create node with full details', async () => {
      const mockNode = createTestNode({ tenantId });
      prisma.node.create.mockResolvedValue(mockNode);

      const dto = {
        name: 'Full Node',
        countryCode: 'US',
        countryName: 'United States',
        city: 'Los Angeles',
        isp: 'Test ISP',
        tags: ['premium'],
      };

      const result = await service.create(tenantId, dto);

      expect(result).toEqual(mockNode);
      expect(prisma.node.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            name: 'Full Node',
            countryCode: 'US',
            tags: ['premium'],
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all nodes for tenant', async () => {
      const nodes = [createTestNode({ tenantId }), createTestNode({ tenantId })];
      prisma.node.findMany.mockResolvedValue(nodes);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.node.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { status: 'online' });

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: 'online' },
        }),
      );
    });

    it('should filter by countryCode', async () => {
      prisma.node.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { countryCode: 'US' });

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, countryCode: 'US' },
        }),
      );
    });

    it('should filter by nodeGroupId', async () => {
      prisma.node.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, { nodeGroupId: 'group-001' });

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, nodeGroupId: 'group-001' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return node by id', async () => {
      const mockNode = createTestNode({ id: 'node-001', tenantId });
      prisma.node.findFirst.mockResolvedValue(mockNode);

      const result = await service.findOne(tenantId, 'node-001');

      expect(result).toEqual(mockNode);
    });

    it('should throw NotFoundException if node not found', async () => {
      prisma.node.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update node', async () => {
      const existingNode = createTestNode({ id: 'node-001', tenantId });
      const updatedNode = { ...existingNode, name: 'Updated Node' };
      prisma.node.findFirst.mockResolvedValue(existingNode);
      prisma.node.update.mockResolvedValue(updatedNode);

      const result = await service.update(tenantId, 'node-001', { name: 'Updated Node' });

      expect(result.name).toBe('Updated Node');
    });

    it('should throw NotFoundException if node not found', async () => {
      prisma.node.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, 'invalid', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete node', async () => {
      const mockNode = createTestNode({ id: 'node-001', tenantId });
      prisma.node.findFirst.mockResolvedValue(mockNode);
      prisma.node.delete.mockResolvedValue(mockNode);

      const result = await service.delete(tenantId, 'node-001');

      expect(result).toEqual(mockNode);
      expect(prisma.node.delete).toHaveBeenCalledWith({ where: { id: 'node-001' } });
    });
  });

  describe('regenerateToken', () => {
    it('should generate new token for node', async () => {
      const mockNode = createTestNode({ id: 'node-001', tenantId });
      prisma.node.findFirst.mockResolvedValue(mockNode);
      prisma.node.update.mockResolvedValue({ ...mockNode, token: 'node_newtoken' });

      await service.regenerateToken(tenantId, 'node-001');

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: { token: expect.stringMatching(/^node_/) },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update node status and lastSeenAt', async () => {
      const mockNode = createTestNode({ id: 'node-001' });
      prisma.node.update.mockResolvedValue({ ...mockNode, status: 'offline' });

      await service.updateStatus('node-001', 'offline');

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: { status: 'offline', lastSeenAt: expect.any(Date) },
      });
    });
  });

  describe('updateRuntimeStats', () => {
    it('should update runtime stats', async () => {
      const stats = { cpuUsage: 25, memoryUsage: 50 };
      prisma.node.update.mockResolvedValue(createTestNode());

      await service.updateRuntimeStats('node-001', stats);

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: { runtimeStats: stats, lastSeenAt: expect.any(Date) },
      });
    });
  });

  describe('updateFromAgent', () => {
    it('should update node info from agent registration', async () => {
      const agentInfo = {
        hostname: 'agent-host',
        os: 'linux',
        arch: 'amd64',
        publicIp: '1.2.3.4',
        countryCode: 'US',
        countryName: 'United States',
        city: 'Los Angeles',
        isp: 'Test ISP',
        version: '1.0.0',
        coreType: 'xray',
        coreVersion: '1.8.0',
      };
      prisma.node.update.mockResolvedValue(createTestNode());

      await service.updateFromAgent('node-001', agentInfo);

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: expect.objectContaining({
          publicIp: '1.2.3.4',
          countryCode: 'US',
          status: 'online',
          systemInfo: expect.objectContaining({ hostname: 'agent-host' }),
        }),
      });
    });
  });

  describe('getInstallCommand', () => {
    it('should return install command for node', async () => {
      const mockNode = createTestNode({ id: 'node-001', tenantId, token: 'node_testtoken' });
      prisma.node.findFirst.mockResolvedValue(mockNode);

      const result = await service.getInstallCommand(tenantId, 'node-001');

      expect(result.token).toBe('node_testtoken');
      expect(result.installCommand).toContain('--token=node_testtoken');
    });
  });

  describe('syncNode', () => {
    it('should invalidate node cache', async () => {
      const mockNode = createTestNode({ id: 'node-001', tenantId });
      prisma.node.findFirst.mockResolvedValue(mockNode);

      const result = await service.syncNode(tenantId, 'node-001');

      expect(result.success).toBe(true);
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith('node-001');
    });
  });
});
