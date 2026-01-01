import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TenantService } from '../tenant.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  createMockPrismaService,
} from '../../../../test/helpers/mock-factory';
import { createTestTenant, createTestUser, createTestApiKey } from '../../../../test/helpers/test-data-factory';

describe('TenantService', () => {
  let service: TenantService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const mockTenant = createTestTenant();
      prisma.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.create({ name: 'Test', slug: 'test' });

      expect(result.slug).toBe('test-tenant');
    });

    it('should throw ConflictException if slug exists', async () => {
      prisma.tenant.findUnique.mockResolvedValue(createTestTenant());

      await expect(service.create({ name: 'Test', slug: 'existing' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return tenant by id', async () => {
      const mockTenant = createTestTenant({ id: 'tenant-001' });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findOne('tenant-001');

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return tenant stats', async () => {
      const mockTenant = createTestTenant({ id: 'tenant-001' });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.node.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
      prisma.client.count.mockResolvedValue(100);
      prisma.client.aggregate.mockResolvedValue({ _sum: { usedBytes: BigInt(1024) } });

      const result = await service.getStats('tenant-001');

      expect(result).toEqual({
        nodeCount: 5,
        clientCount: 100,
        onlineNodes: 3,
        totalTrafficBytes: '1024',
      });
    });
  });

  describe('checkQuota', () => {
    it('should return allowed=true when under node quota', async () => {
      const mockTenant = createTestTenant({ maxNodes: 10 });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.node.count.mockResolvedValue(5);

      const result = await service.checkQuota('tenant-001', 'node');

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.max).toBe(10);
    });

    it('should return allowed=false when at node quota', async () => {
      const mockTenant = createTestTenant({ maxNodes: 5 });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.node.count.mockResolvedValue(5);

      const result = await service.checkQuota('tenant-001', 'node');

      expect(result.allowed).toBe(false);
    });
  });

  describe('API Key Management', () => {
    it('should create API key with hashed value', async () => {
      const mockTenant = createTestTenant({ id: 'tenant-001' });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenantApiKey.create.mockResolvedValue(createTestApiKey());

      const result = await service.createApiKey('tenant-001', { name: 'Test Key' });

      expect(result.key).toMatch(/^pk_/);
      expect(result.prefix).toHaveLength(8);
      expect(prisma.tenantApiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          keyPrefix: expect.any(String),
          keyHash: expect.any(String),
        }),
      });
    });

    it('should delete API key', async () => {
      prisma.tenantApiKey.findFirst.mockResolvedValue(createTestApiKey({ id: 'key-001' }));
      prisma.tenantApiKey.delete.mockResolvedValue({});

      await service.deleteApiKey('tenant-001', 'key-001');

      expect(prisma.tenantApiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-001' } });
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      prisma.tenantApiKey.findFirst.mockResolvedValue(null);

      await expect(service.deleteApiKey('tenant-001', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('User Management', () => {
    it('should create user for tenant', async () => {
      const mockTenant = createTestTenant({ id: 'tenant-001' });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue(null);
      const mockUser = createTestUser();
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.tenantMembership.create.mockResolvedValue({ role: 'operator' });

      const result = await service.createUser('tenant-001', {
        username: 'newuser',
        password: 'pass',
        email: 'u@u.com',
      });

      expect(result.username).toBe('testuser');
    });

    it('should throw ConflictException if user already in tenant', async () => {
      const mockTenant = createTestTenant({ id: 'tenant-001' });
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue(createTestUser());
      prisma.tenantMembership.findUnique.mockResolvedValue({ userId: 'u', tenantId: 't' });

      await expect(
        service.createUser('tenant-001', { username: 'existing', password: 'p', email: 'e@e.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
