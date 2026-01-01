import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NodeGroupService, NODE_GROUP_TEMPLATES } from '../node-group.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { createMockPrismaService, createMockRedisService } from '../../../../test/helpers/mock-factory';
import { createTestNodeGroup, createTestNode } from '../../../../test/helpers/test-data-factory';

describe('NodeGroupService', () => {
  let service: NodeGroupService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodeGroupService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<NodeGroupService>(NodeGroupService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create node group with custom type', async () => {
      const mockGroup = createTestNodeGroup({ tenantId, name: 'US Nodes' });
      prisma.nodeGroup.create.mockResolvedValue(mockGroup);

      const result = await service.create(tenantId, { name: 'US Nodes' });

      expect(result.name).toBe('US Nodes');
    });

    it('should apply residential_socks5 template', async () => {
      const mockGroup = createTestNodeGroup({ tenantId, groupType: 'residential_socks5' });
      prisma.nodeGroup.create.mockResolvedValue(mockGroup);

      await service.create(tenantId, { name: 'Residential', groupType: 'residential_socks5' });

      expect(prisma.nodeGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          groupType: 'residential_socks5',
          schemaFields: NODE_GROUP_TEMPLATES.residential_socks5.schemaFields,
          requiredTags: NODE_GROUP_TEMPLATES.residential_socks5.requiredTags,
        }),
      });
    });

    it('should apply relay template', async () => {
      const mockGroup = createTestNodeGroup({ tenantId, groupType: 'relay' });
      prisma.nodeGroup.create.mockResolvedValue(mockGroup);

      await service.create(tenantId, { name: 'Relay Nodes', groupType: 'relay' });

      expect(prisma.nodeGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          groupType: 'relay',
          requiredTags: NODE_GROUP_TEMPLATES.relay.requiredTags,
        }),
      });
    });

    it('should use custom schemaFields when provided', async () => {
      const customFields = [{ name: 'custom', type: 'string', required: true }];
      const mockGroup = createTestNodeGroup({ tenantId });
      prisma.nodeGroup.create.mockResolvedValue(mockGroup);

      await service.create(tenantId, { name: 'Custom', schemaFields: customFields });

      expect(prisma.nodeGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schemaFields: customFields,
        }),
      });
    });

    it('should set default healthCheck config', async () => {
      const mockGroup = createTestNodeGroup({ tenantId });
      prisma.nodeGroup.create.mockResolvedValue(mockGroup);

      await service.create(tenantId, { name: 'Test Group' });

      expect(prisma.nodeGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          healthCheck: expect.objectContaining({
            enabled: true,
            intervalSeconds: 30,
          }),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all node groups for tenant with node counts', async () => {
      const groups = [
        { ...createTestNodeGroup(), nodes: [], _count: { nodes: 5 } },
        { ...createTestNodeGroup(), nodes: [], _count: { nodes: 3 } },
      ];
      prisma.nodeGroup.findMany.mockResolvedValue(groups);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
      expect(prisma.nodeGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { nodes: true } },
          }),
        }),
      );
    });
  });

  describe('findByType', () => {
    it('should return groups filtered by type with online nodes', async () => {
      const groups = [createTestNodeGroup({ groupType: 'relay' })];
      prisma.nodeGroup.findMany.mockResolvedValue(groups);

      const result = await service.findByType(tenantId, 'relay');

      expect(result).toHaveLength(1);
      expect(prisma.nodeGroup.findMany).toHaveBeenCalledWith({
        where: { tenantId, groupType: 'relay' },
        include: { nodes: { where: { status: 'online' } } },
      });
    });
  });

  describe('findOne', () => {
    it('should return node group by id', async () => {
      const mockGroup = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(mockGroup);

      const result = await service.findOne(tenantId, 'group-001');

      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.nodeGroup.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update node group', async () => {
      const existing = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(existing);
      prisma.nodeGroup.update.mockResolvedValue({ ...existing, name: 'Updated' });

      const result = await service.update(tenantId, 'group-001', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should update lbStrategy', async () => {
      const existing = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(existing);
      prisma.nodeGroup.update.mockResolvedValue({ ...existing, lbStrategy: 'least_conn' });

      await service.update(tenantId, 'group-001', { lbStrategy: 'least_conn' });

      expect(prisma.nodeGroup.update).toHaveBeenCalledWith({
        where: { id: 'group-001' },
        data: expect.objectContaining({ lbStrategy: 'least_conn' }),
      });
    });
  });

  describe('delete', () => {
    it('should delete node group', async () => {
      const existing = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(existing);
      prisma.nodeGroup.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'group-001');

      expect(prisma.nodeGroup.delete).toHaveBeenCalledWith({ where: { id: 'group-001' } });
    });
  });

  describe('addNode', () => {
    it('should add node to group', async () => {
      const mockGroup = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(mockGroup);
      prisma.node.update.mockResolvedValue(createTestNode({ nodeGroupId: 'group-001' }));

      await service.addNode(tenantId, 'group-001', 'node-001');

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: { nodeGroupId: 'group-001' },
      });
    });

    it('should throw NotFoundException if group not found', async () => {
      prisma.nodeGroup.findFirst.mockResolvedValue(null);

      await expect(service.addNode(tenantId, 'invalid', 'node-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeNode', () => {
    it('should remove node from group', async () => {
      const mockGroup = createTestNodeGroup({ id: 'group-001' });
      prisma.nodeGroup.findFirst.mockResolvedValue(mockGroup);
      prisma.node.update.mockResolvedValue(createTestNode({ nodeGroupId: null }));

      await service.removeNode(tenantId, 'group-001', 'node-001');

      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: 'node-001' },
        data: { nodeGroupId: null },
      });
    });
  });

  describe('getTemplates', () => {
    it('should return all available templates', () => {
      const templates = service.getTemplates();

      expect(templates).toHaveProperty('residential_socks5');
      expect(templates).toHaveProperty('relay');
      expect(templates).toHaveProperty('custom');
    });
  });
});
