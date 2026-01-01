import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto, SwitchTenantDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || '';
    return this.authService.login({ ...dto, ip });
  }

  @Post('switch-tenant')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch to another tenant' })
  async switchTenant(@Body() dto: SwitchTenantDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.authService.switchTenant(user.sub, dto.tenantId);
  }

  @Get('tenants')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user tenant list' })
  async getTenants(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.authService.getUserTenants(user.sub);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.authService.refresh(user);
  }
}
