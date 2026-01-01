import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantDto, CreateTenantUserDto, CreateApiKeyDto } from './dto/tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant' })
  getCurrent(@Req() req: Request) {
    const user = req.user as { tenantId: string };
    return this.tenantService.findOne(user.tenantId);
  }

  @Put('current')
  @ApiOperation({ summary: 'Update current tenant' })
  updateCurrent(@Req() req: Request, @Body() dto: UpdateTenantDto) {
    const user = req.user as { tenantId: string };
    return this.tenantService.update(user.tenantId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.tenantService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get tenant statistics' })
  getStats(@Param('id') id: string) {
    return this.tenantService.getStats(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  delete(@Param('id') id: string) {
    return this.tenantService.delete(id);
  }

  // ==================== Tenant Users ====================

  @Get(':id/users')
  @ApiOperation({ summary: 'List tenant users' })
  listUsers(@Param('id') id: string) {
    return this.tenantService.findUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Create tenant user' })
  createUser(@Param('id') id: string, @Body() dto: CreateTenantUserDto) {
    return this.tenantService.createUser(id, dto);
  }

  @Put(':id/users/:userId')
  @ApiOperation({ summary: 'Update tenant user' })
  updateUser(@Param('id') id: string, @Param('userId') userId: string, @Body() dto: Partial<CreateTenantUserDto>) {
    return this.tenantService.updateUser(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: 'Delete tenant user' })
  deleteUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tenantService.deleteUser(id, userId);
  }

  // ==================== API Keys ====================

  @Get(':id/api-keys')
  @ApiOperation({ summary: 'List API keys' })
  listApiKeys(@Param('id') id: string) {
    return this.tenantService.findApiKeys(id);
  }

  @Post(':id/api-keys')
  @ApiOperation({ summary: 'Create API key' })
  createApiKey(@Param('id') id: string, @Body() dto: CreateApiKeyDto) {
    return this.tenantService.createApiKey(id, dto);
  }

  @Delete(':id/api-keys/:keyId')
  @ApiOperation({ summary: 'Delete API key' })
  deleteApiKey(@Param('id') id: string, @Param('keyId') keyId: string) {
    return this.tenantService.deleteApiKey(id, keyId);
  }
}
