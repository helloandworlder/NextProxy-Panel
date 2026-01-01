import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tenantMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    tenantApiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    node: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    let mockUser: {
      id: string;
      username: string;
      passwordHash: string;
      email: string;
      enable: boolean;
      tenantMemberships: Array<{
        tenantId: string;
        role: string;
        isDefault: boolean;
        tenant: { id: string; name: string; slug: string; status: string };
      }>;
    };

    beforeEach(async () => {
      mockUser = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: await bcrypt.hash('password123', 10),
        email: 'test@example.com',
        enable: true,
        tenantMemberships: [
          {
            tenantId: 'tenant-id',
            role: 'admin',
            isDefault: true,
            tenant: { id: 'tenant-id', name: 'Test Tenant', slug: 'test', status: 'active' },
          },
        ],
      };
    });

    it('should return accessToken and user on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.username).toBe('testuser');
      expect(result.currentTenant.id).toBe('tenant-id');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        tenantId: 'tenant-id',
        username: 'testuser',
        role: 'admin',
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'wrong', password: 'wrong' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ username: 'testuser', password: 'wrongpassword' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('validateNodeToken', () => {
    it('should return node for valid token', async () => {
      const mockNode = { id: 'node-id', token: 'valid-token', tenant: { id: 'tenant-id' } };
      mockPrismaService.node.findUnique.mockResolvedValue(mockNode);

      const result = await service.validateNodeToken('valid-token');
      expect(result).toEqual(mockNode);
    });

    it('should return null for invalid token', async () => {
      mockPrismaService.node.findUnique.mockResolvedValue(null);

      const result = await service.validateNodeToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword';
      const hash = await service.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });
  });

  describe('login - edge cases', () => {
    it('should throw UnauthorizedException when user has no tenant memberships', async () => {
      const userNoTenants = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: await bcrypt.hash('password123', 10),
        email: 'test@example.com',
        enable: true,
        tenantMemberships: [],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userNoTenants);

      await expect(
        service.login({ username: 'testuser', password: 'password123' }),
      ).rejects.toThrow('User has no tenant access');
    });

    it('should throw UnauthorizedException when no active tenants', async () => {
      const userInactiveTenants = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: await bcrypt.hash('password123', 10),
        email: 'test@example.com',
        enable: true,
        tenantMemberships: [
          {
            tenantId: 'tenant-id',
            role: 'admin',
            isDefault: true,
            tenant: { id: 'tenant-id', name: 'Test', slug: 'test', status: 'suspended' },
          },
        ],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userInactiveTenants);

      await expect(
        service.login({ username: 'testuser', password: 'password123' }),
      ).rejects.toThrow('No active tenants available');
    });

    it('should select first tenant when no default is set', async () => {
      const userNoDefault = {
        id: 'user-id',
        username: 'testuser',
        passwordHash: await bcrypt.hash('password123', 10),
        email: 'test@example.com',
        enable: true,
        tenantMemberships: [
          {
            tenantId: 'tenant-1',
            role: 'operator',
            isDefault: false,
            tenant: { id: 'tenant-1', name: 'Tenant 1', slug: 't1', status: 'active' },
          },
          {
            tenantId: 'tenant-2',
            role: 'admin',
            isDefault: false,
            tenant: { id: 'tenant-2', name: 'Tenant 2', slug: 't2', status: 'active' },
          },
        ],
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userNoDefault);
      mockPrismaService.user.update.mockResolvedValue(userNoDefault);

      const result = await service.login({ username: 'testuser', password: 'password123' });

      expect(result.currentTenant.id).toBe('tenant-1');
    });
  });

  describe('switchTenant', () => {
    it('should return new token for valid tenant switch', async () => {
      const mockMembership = {
        userId: 'user-id',
        tenantId: 'tenant-2',
        role: 'operator',
        isDefault: false,
        tenant: { id: 'tenant-2', name: 'Tenant 2', slug: 't2', status: 'active' },
        user: { username: 'testuser' },
      };
      mockPrismaService.tenantMembership.findUnique.mockResolvedValue(mockMembership);

      const result = await service.switchTenant('user-id', 'tenant-2');

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.currentTenant.id).toBe('tenant-2');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        tenantId: 'tenant-2',
        username: 'testuser',
        role: 'operator',
      });
    });

    it('should throw UnauthorizedException for invalid tenant access', async () => {
      mockPrismaService.tenantMembership.findUnique.mockResolvedValue(null);

      await expect(
        service.switchTenant('user-id', 'invalid-tenant'),
      ).rejects.toThrow('Invalid tenant access');
    });

    it('should throw UnauthorizedException for inactive tenant', async () => {
      const mockMembership = {
        userId: 'user-id',
        tenantId: 'tenant-2',
        role: 'operator',
        tenant: { id: 'tenant-2', name: 'Tenant 2', slug: 't2', status: 'suspended' },
        user: { username: 'testuser' },
      };
      mockPrismaService.tenantMembership.findUnique.mockResolvedValue(mockMembership);

      await expect(
        service.switchTenant('user-id', 'tenant-2'),
      ).rejects.toThrow('Invalid tenant access');
    });
  });

  describe('getUserTenants', () => {
    it('should return list of active tenants for user', async () => {
      const mockMemberships = [
        {
          tenantId: 'tenant-1',
          role: 'admin',
          isDefault: true,
          tenant: { id: 'tenant-1', name: 'Tenant 1', slug: 't1', status: 'active' },
        },
        {
          tenantId: 'tenant-2',
          role: 'operator',
          isDefault: false,
          tenant: { id: 'tenant-2', name: 'Tenant 2', slug: 't2', status: 'active' },
        },
        {
          tenantId: 'tenant-3',
          role: 'viewer',
          isDefault: false,
          tenant: { id: 'tenant-3', name: 'Tenant 3', slug: 't3', status: 'suspended' },
        },
      ];
      mockPrismaService.tenantMembership.findMany.mockResolvedValue(mockMemberships);

      const result = await service.getUserTenants('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tenant-1');
      expect(result[1].id).toBe('tenant-2');
    });

    it('should return empty array when user has no memberships', async () => {
      mockPrismaService.tenantMembership.findMany.mockResolvedValue([]);

      const result = await service.getUserTenants('user-id');

      expect(result).toHaveLength(0);
    });
  });

  describe('validateApiKey', () => {
    it('should return API key and update lastUsedAt for valid key', async () => {
      const mockApiKey = {
        id: 'key-id',
        tenantId: 'tenant-id',
        keyPrefix: 'pk_test1',
        keyHash: 'hashed-key',
        scopes: ['*'],
        tenant: { id: 'tenant-id' },
      };
      mockPrismaService.tenantApiKey.findFirst.mockResolvedValue(mockApiKey);
      mockPrismaService.tenantApiKey.update.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey('pk_test1', 'hashed-key');

      expect(result).toEqual(mockApiKey);
      expect(mockPrismaService.tenantApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-id' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should return null for invalid API key', async () => {
      mockPrismaService.tenantApiKey.findFirst.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid', 'invalid');

      expect(result).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should return new access token', async () => {
      const payload = {
        sub: 'user-id',
        tenantId: 'tenant-id',
        username: 'testuser',
        role: 'admin',
      };

      const result = await service.refresh(payload);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
    });
  });
});
