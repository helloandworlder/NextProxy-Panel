import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface SystemAdminJwtPayload {
  sub: string;
  username: string;
  role: 'system_admin';
  isSystemAdmin: true;
}

@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify<SystemAdminJwtPayload>(token);

      // Check if it's a system admin token
      if (!payload.isSystemAdmin || payload.role !== 'system_admin') {
        throw new UnauthorizedException('System admin access required');
      }

      // Validate the admin still exists and is enabled
      const admin = await this.prisma.systemAdmin.findUnique({
        where: { id: payload.sub, enable: true },
      });
      
      if (!admin) {
        throw new UnauthorizedException('System admin not found or disabled');
      }

      // Attach admin info to request
      request.systemAdmin = {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
