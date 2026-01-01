import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BalancerService } from '../balancer.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../../test/helpers/mock-factory';

describe('BalancerService', () => {
  let service: BalancerService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  const tenantId = 'tenant-001';
  const nodeId = 'node-001';

  const mockBalancer = {
    id: 'balancer-001',
    tenantId,
    nodeId,
    tag: 'lb-out',
    balancerConfig: JSON.stringify({ selector: ['proxy-1', 'proxy-2'], strategy: { type: 'random' } }),
    enable: true,
    remark: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BalancerService>(BalancerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create balancer with default config', async () => {
      prisma.balancer.create.mockResolvedValue(mockBalancer);

      const result = await service.create(tenantId, { nodeId, tag: 'lb-out' });

      expect(result.tag).toBe('lb-out');
      expect(prisma.balancer.create).toHaveBeenCalled();
    });

    it('should create balancer with custom config', async () => {
      prisma.balancer.create.mockResolvedValue(mockBalancer);

      await service.create(tenantId, {
        nodeId,
        tag: 'lb-out',
        balancerConfig: { selector: ['proxy-1'], strategy: { type: 'leastPing' } },
      });

      expect(prisma.balancer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balancerConfig: expect.stringContaining('leastPing'),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all balancers for tenant', async () => {
      prisma.balancer.findMany.mockResolvedValue([mockBalancer]);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(1);
    });

    it('should filter by nodeId', async () => {
      prisma.balancer.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, nodeId);

      expect(prisma.balancer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId, nodeId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return balancer by id', async () => {
      prisma.balancer.findFirst.mockResolvedValue(mockBalancer);

      const result = await service.findOne(tenantId, 'balancer-001');

      expect(result).toEqual(mockBalancer);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.balancer.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update balancer', async () => {
      prisma.balancer.findFirst.mockResolvedValue(mockBalancer);
      prisma.balancer.update.mockResolvedValue({ ...mockBalancer, enable: false });

      const result = await service.update(tenantId, 'balancer-001', { enable: false });

      expect(result.enable).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete balancer', async () => {
      prisma.balancer.findFirst.mockResolvedValue(mockBalancer);
      prisma.balancer.delete.mockResolvedValue(mockBalancer);

      await service.delete(tenantId, 'balancer-001');

      expect(prisma.balancer.delete).toHaveBeenCalledWith({ where: { id: 'balancer-001' } });
    });
  });
});
