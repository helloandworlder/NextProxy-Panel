import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;        // userId
  tenantId: string;   // 当前租户 ID
  username: string;
  role: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  isDefault: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户登录 - 新流程
   * 1. 验证用户名密码
   * 2. 返回用户所属的所有租户列表
   * 3. 自动选择默认租户或第一个租户
   */
  async login(dto: LoginDto) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username, enable: true },
      include: {
        tenantMemberships: {
          include: { tenant: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.tenantMemberships.length === 0) {
      throw new UnauthorizedException('User has no tenant access');
    }

    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: dto.ip },
    });

    // 获取租户列表
    const tenants: TenantInfo[] = user.tenantMemberships
      .filter(m => m.tenant.status === 'active')
      .map(m => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        isDefault: m.isDefault,
      }));

    if (tenants.length === 0) {
      throw new UnauthorizedException('No active tenants available');
    }

    // 选择默认租户或第一个租户
    const defaultTenant = tenants.find(t => t.isDefault) || tenants[0];
    const membership = user.tenantMemberships.find(m => m.tenantId === defaultTenant.id)!;

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: defaultTenant.id,
      username: user.username,
      role: membership.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      currentTenant: defaultTenant,
      tenants,
    };
  }

  /**
   * 切换租户 - 无需重新登录
   */
  async switchTenant(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true, user: true },
    });

    if (!membership || membership.tenant.status !== 'active') {
      throw new UnauthorizedException('Invalid tenant access');
    }

    const payload: JwtPayload = {
      sub: userId,
      tenantId: membership.tenantId,
      username: membership.user.username,
      role: membership.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      currentTenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        role: membership.role,
        isDefault: membership.isDefault,
      },
    };
  }

  /**
   * 获取用户所属租户列表
   */
  async getUserTenants(userId: string): Promise<TenantInfo[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { isDefault: 'desc' },
    });

    return memberships
      .filter(m => m.tenant.status === 'active')
      .map(m => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        isDefault: m.isDefault,
      }));
  }

  async validateApiKey(keyPrefix: string, keyHash: string) {
    const apiKey = await this.prisma.tenantApiKey.findFirst({
      where: {
        keyPrefix,
        keyHash,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { tenant: true },
    });

    if (!apiKey) return null;

    await this.prisma.tenantApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  async validateNodeToken(token: string) {
    const node = await this.prisma.node.findUnique({
      where: { token },
      include: { tenant: true },
    });
    return node;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async refresh(user: JwtPayload) {
    const payload: JwtPayload = {
      sub: user.sub,
      tenantId: user.tenantId,
      username: user.username,
      role: user.role,
    };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
