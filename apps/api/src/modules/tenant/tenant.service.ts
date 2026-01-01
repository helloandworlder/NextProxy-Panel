import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto, CreateApiKeyDto, CreateTenantUserDto } from './dto/tenant.dto';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  // ==================== Tenant CRUD ====================

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        maxNodes: dto.maxNodes ?? 10,
        maxClients: dto.maxClients ?? 1000,
        maxTrafficBytes: dto.maxTrafficBytes ? BigInt(dto.maxTrafficBytes) : BigInt(0),
        settings: dto.settings || {},
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        maxNodes: dto.maxNodes,
        maxClients: dto.maxClients,
        maxTrafficBytes: dto.maxTrafficBytes ? BigInt(dto.maxTrafficBytes) : undefined,
        settings: dto.settings,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.delete({ where: { id } });
  }

  // ==================== Tenant Stats ====================

  async getStats(tenantId: string) {
    const [nodeCount, clientCount, onlineNodes, totalTraffic] = await Promise.all([
      this.prisma.node.count({ where: { tenantId } }),
      this.prisma.client.count({ where: { tenantId } }),
      this.prisma.node.count({ where: { tenantId, status: 'online' } }),
      this.prisma.client.aggregate({ where: { tenantId }, _sum: { usedBytes: true } }),
    ]);
    return {
      nodeCount,
      clientCount,
      onlineNodes,
      totalTrafficBytes: totalTraffic._sum.usedBytes?.toString() || '0',
    };
  }

  async checkQuota(tenantId: string, type: 'node' | 'client') {
    const tenant = await this.findOne(tenantId);
    if (type === 'node') {
      const count = await this.prisma.node.count({ where: { tenantId } });
      return { allowed: count < tenant.maxNodes, current: count, max: tenant.maxNodes };
    } else {
      const count = await this.prisma.client.count({ where: { tenantId } });
      return { allowed: count < tenant.maxClients, current: count, max: tenant.maxClients };
    }
  }

  // ==================== Tenant Users (via TenantMembership) ====================

  async createUser(tenantId: string, dto: CreateTenantUserDto) {
    await this.findOne(tenantId);
    
    // Check if user already exists
    let user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    
    if (user) {
      // Check if already a member of this tenant
      const existingMembership = await this.prisma.tenantMembership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId } },
      });
      if (existingMembership) throw new ConflictException('User already exists in this tenant');
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.prisma.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          enable: dto.enable ?? true,
        },
      });
    }

    // Create membership
    const membership = await this.prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId,
        role: dto.role || 'operator',
        permissions: dto.permissions || [],
      },
      include: { user: true },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: membership.role,
      enable: user.enable,
      createdAt: user.createdAt,
    };
  }

  async findUsers(tenantId: string) {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: { user: true },
    });
    return memberships.map(m => ({
      id: m.user.id,
      username: m.user.username,
      email: m.user.email,
      role: m.role,
      enable: m.user.enable,
      lastLoginAt: m.user.lastLoginAt,
      createdAt: m.user.createdAt,
    }));
  }

  async updateUser(tenantId: string, userId: string, data: Partial<CreateTenantUserDto>) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('User not found in this tenant');

    // Update user fields
    if (data.email || data.password || data.enable !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: data.email,
          enable: data.enable,
          ...(data.password && { passwordHash: await bcrypt.hash(data.password, 10) }),
        },
      });
    }

    // Update membership fields
    if (data.role || data.permissions) {
      await this.prisma.tenantMembership.update({
        where: { userId_tenantId: { userId, tenantId } },
        data: {
          role: data.role,
          permissions: data.permissions,
        },
      });
    }

    const updated = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { user: true },
    });

    return {
      id: updated!.user.id,
      username: updated!.user.username,
      email: updated!.user.email,
      role: updated!.role,
      enable: updated!.user.enable,
    };
  }

  async deleteUser(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('User not found in this tenant');
    
    // Delete membership (not the user itself, as they may belong to other tenants)
    return this.prisma.tenantMembership.delete({
      where: { userId_tenantId: { userId, tenantId } },
    });
  }

  // ==================== API Keys ====================

  async createApiKey(tenantId: string, dto: CreateApiKeyDto) {
    await this.findOne(tenantId);
    
    const rawKey = `pk_${randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    await this.prisma.tenantApiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes: dto.scopes || ['*'],
        rateLimit: dto.rateLimit || 1000,
        allowedIps: dto.allowedIps || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return { key: rawKey, prefix: keyPrefix };
  }

  async findApiKeys(tenantId: string) {
    return this.prisma.tenantApiKey.findMany({
      where: { tenantId },
      select: { id: true, name: true, keyPrefix: true, scopes: true, rateLimit: true, expiresAt: true, lastUsedAt: true, createdAt: true },
    });
  }

  async deleteApiKey(tenantId: string, keyId: string) {
    const key = await this.prisma.tenantApiKey.findFirst({ where: { id: keyId, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    return this.prisma.tenantApiKey.delete({ where: { id: keyId } });
  }
}
