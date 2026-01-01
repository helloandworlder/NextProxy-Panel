import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoutingService } from '../routing.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { RoutingValidator } from '../../../common/validators/routing.validator';
import {
  createMockPrismaService,
  createMockRedisService,
  createMockRoutingValidator,
} from '../../../../test/helpers/mock-factory';
import {
  createTestRoutingRule,
  createDomainRoutingRule,
} from '../../../../test/helpers/test-data-factory';

describe('RoutingService', () => {
  let service: RoutingService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let redis: ReturnType<typeof createMockRedisService>;
  let validator: ReturnType<typeof createMockRoutingValidator>;

  const tenantId = 'tenant-001';
  const nodeId = 'node-001';

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();
    validator = createMockRoutingValidator();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: RoutingValidator, useValue: validator },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create routing rule with inbound-to-outbound mapping', async () => {
      const mockRule = createTestRoutingRule({ nodeId });
      prisma.routingRule.create.mockResolvedValue(mockRule);

      const result = await service.create(tenantId, {
        nodeId,
        ruleTag: 'default-route',
        ruleConfig: {
          type: 'field',
          inboundTag: ['vless-in'],
          outboundTag: 'direct',
        },
      });

      expect(result.ruleTag).toBe('default-route');
      expect(validator.validate).toHaveBeenCalled();
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should create domain-based routing rule', async () => {
      const mockRule = createDomainRoutingRule({ nodeId });
      prisma.routingRule.create.mockResolvedValue(mockRule);

      await service.create(tenantId, {
        nodeId,
        ruleTag: 'block-ads',
        priority: 50,
        ruleConfig: {
          type: 'field',
          domain: ['geosite:category-ads-all'],
          outboundTag: 'block',
        },
      });

      expect(prisma.routingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ruleTag: 'block-ads',
            priority: 50,
          }),
        }),
      );
    });

    it('should create IP-based routing rule', async () => {
      const mockRule = createTestRoutingRule({ nodeId });
      prisma.routingRule.create.mockResolvedValue(mockRule);

      await service.create(tenantId, {
        nodeId,
        ruleTag: 'direct-cn',
        ruleConfig: {
          type: 'field',
          ip: ['geoip:cn'],
          outboundTag: 'direct',
        },
      });

      expect(prisma.routingRule.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on validation failure', async () => {
      validator.validate.mockResolvedValue({
        valid: false,
        errors: ['Invalid routing rule'],
        warnings: [],
      });

      await expect(
        service.create(tenantId, {
          nodeId,
          ruleTag: 'invalid',
          ruleConfig: { invalid: true },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default priority if not provided', async () => {
      const mockRule = createTestRoutingRule({ nodeId, priority: 100 });
      prisma.routingRule.create.mockResolvedValue(mockRule);

      await service.create(tenantId, {
        nodeId,
        ruleTag: 'test-rule',
        ruleConfig: { type: 'field', outboundTag: 'direct' },
      });

      expect(prisma.routingRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 100 }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all routing rules for tenant', async () => {
      const rules = [createTestRoutingRule(), createDomainRoutingRule()];
      prisma.routingRule.findMany.mockResolvedValue(rules);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(2);
    });

    it('should filter by nodeId', async () => {
      prisma.routingRule.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, nodeId);

      expect(prisma.routingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, nodeId },
        }),
      );
    });

    it('should order by priority', async () => {
      prisma.routingRule.findMany.mockResolvedValue([]);

      await service.findAll(tenantId);

      expect(prisma.routingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return routing rule by id', async () => {
      const mockRule = createTestRoutingRule({ id: 'rule-001' });
      prisma.routingRule.findFirst.mockResolvedValue(mockRule);

      const result = await service.findOne(tenantId, 'rule-001');

      expect(result).toEqual(mockRule);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.routingRule.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update routing rule and invalidate cache', async () => {
      const existing = createTestRoutingRule({ id: 'rule-001', nodeId });
      prisma.routingRule.findFirst.mockResolvedValue(existing);
      prisma.routingRule.update.mockResolvedValue({ ...existing, priority: 50 });

      const result = await service.update(tenantId, 'rule-001', { priority: 50 });

      expect(result.priority).toBe(50);
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });

    it('should validate ruleConfig on update', async () => {
      const existing = createTestRoutingRule({ id: 'rule-001', nodeId });
      prisma.routingRule.findFirst.mockResolvedValue(existing);
      prisma.routingRule.update.mockResolvedValue(existing);

      await service.update(tenantId, 'rule-001', {
        ruleConfig: { type: 'field', outboundTag: 'block' },
      });

      expect(validator.validate).toHaveBeenCalled();
    });

    it('should throw BadRequestException on validation failure', async () => {
      const existing = createTestRoutingRule({ id: 'rule-001' });
      prisma.routingRule.findFirst.mockResolvedValue(existing);
      validator.validate.mockResolvedValue({
        valid: false,
        errors: ['Invalid update'],
        warnings: [],
      });

      await expect(
        service.update(tenantId, 'rule-001', { ruleConfig: { invalid: true } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete routing rule and invalidate cache', async () => {
      const existing = createTestRoutingRule({ id: 'rule-001', nodeId });
      prisma.routingRule.findFirst.mockResolvedValue(existing);
      prisma.routingRule.delete.mockResolvedValue(existing);

      await service.delete(tenantId, 'rule-001');

      expect(prisma.routingRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-001' } });
      expect(redis.invalidateNodeCache).toHaveBeenCalledWith(nodeId);
    });
  });
});
