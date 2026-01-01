import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SystemAdminService } from '../system-admin.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as bcrypt from 'bcrypt';
import {
  createMockPrismaService,
  createMockJwtService,
  createMockRedisService,
} from '../../../../test/helpers/mock-factory';
import { createTestSystemAdmin, createTestTenant, createTestUser } from '../../../../test/helpers/test-data-factory';

describe('SystemAdminService', () => {
  let service: SystemAdminService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let redis: ReturnType<typeof createMockRedisService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    jwtService = createMockJwtService();
    redis = createMockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<SystemAdminService>(SystemAdminService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('should return token and user on successful login', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const mockAdmin = createTestSystemAdmin({ passwordHash, enable: true });
      prisma.systemAdmin.findUnique.mockResolvedValue(mockAdmin);
      prisma.systemAdmin.update.mockResolvedValue(mockAdmin);

      const result = await service.login({
        username: 'sysadmin',
        password: 'password123',
      });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.isSystemAdmin).toBe(true);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          isSystemAdmin: true,
          role: 'system_admin',
        }),
      );
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      prisma.systemAdmin.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'invalid', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct', 10);
      const mockAdmin = createTestSystemAdmin({ passwordHash });
      prisma.systemAdmin.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.login({ username: 'sysadmin', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject disabled admin login', async () => {
      prisma.systemAdmin.findUnique.mockResolvedValue(null); // enable: true in query

      await expect(
        service.login({ username: 'disabled', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update lastLoginAt and lastLoginIp on successful login', async () => {
      const passwordHash = await bcrypt.hash('password', 10);
      const mockAdmin = createTestSystemAdmin({ passwordHash });
      prisma.systemAdmin.findUnique.mockResolvedValue(mockAdmin);
      prisma.systemAdmin.update.mockResolvedValue(mockAdmin);

      await service.login({ username: 'sysadmin', password: 'password', ip: '192.168.1.1' });

      expect(prisma.systemAdmin.update).toHaveBeenCalledWith({
        where: { id: mockAdmin.id },
        data: { lastLoginAt: expect.any(Date), lastLoginIp: '192.168.1.1' },
      });
    });
  });

  describe('create', () => {
    it('should create system admin with hashed password', async () => {
      prisma.systemAdmin.findUnique.mockResolvedValue(null);
      const mockAdmin = createTestSystemAdmin();
      prisma.systemAdmin.create.mockResolvedValue(mockAdmin);

      const result = await service.create({
        username: 'newadmin',
        password: 'password123',
        email: 'admin@test.com',
      });

      expect(result.username).toBe('sysadmin');
      expect(prisma.systemAdmin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'newadmin',
          passwordHash: expect.any(String),
        }),
      });
    });

    it('should throw ConflictException if username exists', async () => {
      prisma.systemAdmin.findUnique.mockResolvedValue(createTestSystemAdmin());

      await expect(
        service.create({ username: 'existing', password: 'pass', email: 'e@e.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should prevent deleting the last system admin', async () => {
      prisma.systemAdmin.count.mockResolvedValue(1);

      await expect(service.delete('admin-001')).rejects.toThrow(ConflictException);
      await expect(service.delete('admin-001')).rejects.toThrow('Cannot delete the last system admin');
    });

    it('should allow deleting when multiple admins exist', async () => {
      prisma.systemAdmin.count.mockResolvedValue(2);
      prisma.systemAdmin.delete.mockResolvedValue({});

      const result = await service.delete('admin-001');

      expect(result.success).toBe(true);
    });
  });

  describe('validateSystemAdmin', () => {
    it('should return admin for valid enabled admin', async () => {
      const mockAdmin = createTestSystemAdmin({ enable: true });
      prisma.systemAdmin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.validateSystemAdmin('admin-001');

      expect(result).toEqual(mockAdmin);
    });

    it('should return null for disabled admin', async () => {
      prisma.systemAdmin.findUnique.mockResolvedValue(null);

      const result = await service.validateSystemAdmin('admin-001');

      expect(result).toBeNull();
    });
  });

  describe('Tenant Management', () => {
    it('should create tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const mockTenant = createTestTenant();
      prisma.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.createTenant({ name: 'Test', slug: 'test' });

      expect(result.slug).toBe('test-tenant');
    });

    it('should throw ConflictException if tenant slug exists', async () => {
      prisma.tenant.findUnique.mockResolvedValue(createTestTenant());

      await expect(
        service.createTenant({ name: 'Test', slug: 'existing' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('User Management', () => {
    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const mockUser = createTestUser();
      prisma.user.create.mockResolvedValue(mockUser);

      await service.createUser({ username: 'newuser', password: 'pass', email: 'u@u.com' });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passwordHash: expect.any(String),
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getDashboardStats', () => {
    it('should return aggregated stats', async () => {
      prisma.tenant.count.mockResolvedValue(5);
      prisma.user.count.mockResolvedValue(10);
      prisma.node.count.mockResolvedValueOnce(20).mockResolvedValueOnce(15);
      prisma.client.count.mockResolvedValue(100);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        tenantCount: 5,
        userCount: 10,
        nodeCount: 20,
        clientCount: 100,
        onlineNodes: 15,
      });
    });
  });
});
