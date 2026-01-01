import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { 
  CreateSystemAdminDto, UpdateSystemAdminDto, SystemAdminLoginDto,
  CreateTenantDto, UpdateTenantDto,
  CreateUserDto, UpdateUserDto, AssignTenantDto,
  UpdateSystemSettingDto, ValidateReleaseDto
} from './dto/system-admin.dto';
import type { SystemAdminJwtPayload } from '../auth/guards/system-admin.guard';

const SETTINGS_CACHE_KEY = 'system:settings';
const SETTINGS_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class SystemAdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async login(dto: SystemAdminLoginDto) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { username: dto.username, enable: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.systemAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: dto.ip },
    });

    const payload: SystemAdminJwtPayload = {
      sub: admin.id,
      username: admin.username,
      role: 'system_admin',
      isSystemAdmin: true,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'system_admin',
        isSystemAdmin: true,
      },
    };
  }

  async create(dto: CreateSystemAdminDto) {
    const existing = await this.prisma.systemAdmin.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.systemAdmin.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
      },
    });

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      enable: admin.enable,
      createdAt: admin.createdAt,
    };
  }

  async findAll() {
    const admins = await this.prisma.systemAdmin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        enable: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return admins;
  }

  async findOne(id: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        enable: true,
        permissions: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('System admin not found');
    }

    return admin;
  }

  async update(id: string, dto: UpdateSystemAdminDto) {
    const admin = await this.prisma.systemAdmin.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException('System admin not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.enable !== undefined) data.enable = dto.enable;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.systemAdmin.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        enable: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async delete(id: string) {
    // Prevent deleting the last system admin
    const count = await this.prisma.systemAdmin.count();
    if (count <= 1) {
      throw new ConflictException('Cannot delete the last system admin');
    }

    await this.prisma.systemAdmin.delete({ where: { id } });
    return { success: true };
  }

  async validateSystemAdmin(id: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { id, enable: true },
    });
    return admin;
  }

  // ==================== Tenant Management ====================

  async createTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Tenant slug already exists');

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        maxNodes: dto.maxNodes ?? 100,
        maxClients: dto.maxClients ?? 10000,
        settings: (dto.settings || {}) as object,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async findAllTenants(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ 
        where, skip, take: limit, 
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { memberships: true, nodes: true, clients: true } } },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOneTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ 
      where: { id },
      include: { _count: { select: { memberships: true, nodes: true, clients: true } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.findOneTenant(id);
    return this.prisma.tenant.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        maxNodes: dto.maxNodes,
        maxClients: dto.maxClients,
        settings: dto.settings as object | undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async deleteTenant(id: string) {
    await this.findOneTenant(id);
    return this.prisma.tenant.delete({ where: { id } });
  }

  // ==================== User Management ====================

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        enable: dto.enable ?? true,
      },
      select: { id: true, username: true, email: true, enable: true, createdAt: true },
    });
  }

  async findAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, enable: true,
          lastLoginAt: true, createdAt: true,
          tenantMemberships: { include: { tenant: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total, page, limit };
  }

  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, email: true, enable: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        tenantMemberships: { include: { tenant: { select: { id: true, name: true, slug: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.findOneUser(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        enable: dto.enable,
        ...(dto.password && { passwordHash: await bcrypt.hash(dto.password, 10) }),
      },
      select: { id: true, username: true, email: true, enable: true, updatedAt: true },
    });
  }

  async deleteUser(id: string) {
    await this.findOneUser(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async assignUserToTenant(userId: string, dto: AssignTenantDto) {
    await this.findOneUser(userId);
    await this.findOneTenant(dto.tenantId);

    return this.prisma.tenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId: dto.tenantId } },
      update: { role: dto.role, permissions: dto.permissions, isDefault: dto.isDefault },
      create: {
        userId,
        tenantId: dto.tenantId,
        role: dto.role || 'operator',
        permissions: dto.permissions || [],
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async removeUserFromTenant(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('User is not a member of this tenant');
    return this.prisma.tenantMembership.delete({ where: { userId_tenantId: { userId, tenantId } } });
  }

  // ==================== Dashboard Stats ====================

  async getDashboardStats() {
    const [tenantCount, userCount, nodeCount, clientCount, onlineNodes] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.node.count(),
      this.prisma.client.count(),
      this.prisma.node.count({ where: { status: 'online' } }),
    ]);
    return { tenantCount, userCount, nodeCount, clientCount, onlineNodes };
  }

  // ==================== System Settings ====================

  // Default settings
  private readonly defaultSettings: Record<string, unknown> = {
    'agent.github.repo': 'nextproxy/agent',
    'agent.github.release': 'latest',
    'agent.binary.name': 'agent-{os}-{arch}',
    'xray.github.repo': 'XTLS/Xray-core',
    'xray.github.release': 'latest',
  };

  async getAllSettings() {
    // Try cache first
    const cached = await this.redis.get(SETTINGS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    // Fetch from DB
    const settings = await this.prisma.systemSetting.findMany();
    const result: Record<string, unknown> = { ...this.defaultSettings };
    for (const s of settings) {
      result[s.key] = s.value;
    }

    // Cache result
    await this.redis.set(SETTINGS_CACHE_KEY, JSON.stringify(result), SETTINGS_CACHE_TTL);
    return result;
  }

  async getSetting(key: string) {
    // Try to get from cached settings first
    const allSettings = await this.getAllSettings();
    if (key in allSettings) {
      return { key, value: allSettings[key] };
    }
    throw new NotFoundException(`Setting ${key} not found`);
  }

  async updateSetting(key: string, dto: UpdateSystemSettingDto) {
    const result = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: dto.value as object },
      create: { key, value: dto.value as object },
    });

    // Invalidate cache
    await this.redis.del(SETTINGS_CACHE_KEY);
    return result;
  }

  async validateGitHubRelease(dto: ValidateReleaseDto) {
    const { repo, release } = dto;
    const tag = release || 'latest';
    
    try {
      const url = tag === 'latest'
        ? `https://api.github.com/repos/${repo}/releases/latest`
        : `https://api.github.com/repos/${repo}/releases/tags/${tag}`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Panel-Agent' },
      });
      
      if (!response.ok) {
        return { valid: false, error: `Release not found: ${response.status}` };
      }
      
      const data = await response.json() as { tag_name: string; name: string; assets: Array<{ name: string; browser_download_url: string }> };
      return {
        valid: true,
        release: {
          tag: data.tag_name,
          name: data.name,
          assets: data.assets.map((a) => ({ name: a.name, url: a.browser_download_url })),
        },
      };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  async getAgentDownloadUrl(os: string, arch: string) {
    const settings = await this.getAllSettings();
    const repo = settings['agent.github.repo'] as string;
    const release = settings['agent.github.release'] as string;
    const binaryName = (settings['agent.binary.name'] as string)
      .replace('{os}', os)
      .replace('{arch}', arch);
    
    // Get actual release tag
    const tag = release === 'latest' 
      ? await this.getLatestReleaseTag(repo)
      : release;
    
    return `https://github.com/${repo}/releases/download/${tag}/${binaryName}`;
  }

  private async getLatestReleaseTag(repo: string): Promise<string> {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { 'User-Agent': 'Panel-Agent' },
      });
      if (response.ok) {
        const data = await response.json() as { tag_name: string };
        return data.tag_name;
      }
    } catch {
      // ignore
    }
    return 'latest';
  }
}
