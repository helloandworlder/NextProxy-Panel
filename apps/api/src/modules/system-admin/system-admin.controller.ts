import { Controller, Post, Get, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SystemAdminService } from './system-admin.service';
import { 
  CreateSystemAdminDto, UpdateSystemAdminDto, SystemAdminLoginDto,
  CreateTenantDto, UpdateTenantDto,
  CreateUserDto, UpdateUserDto, AssignTenantDto,
  UpdateSystemSettingDto, ValidateReleaseDto
} from './dto/system-admin.dto';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('system-admin')
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  // ==================== Auth ====================

  @Public()
  @Post('login')
  async login(@Body() dto: SystemAdminLoginDto, @Req() req: Request) {
    dto.ip = req.ip || req.socket.remoteAddress;
    return this.systemAdminService.login(dto);
  }

  // ==================== Dashboard ====================

  @UseGuards(SystemAdminGuard)
  @Get('dashboard')
  async getDashboard() {
    return this.systemAdminService.getDashboardStats();
  }

  // ==================== System Admins ====================

  @UseGuards(SystemAdminGuard)
  @Post('admins')
  async createAdmin(@Body() dto: CreateSystemAdminDto) {
    return this.systemAdminService.create(dto);
  }

  @UseGuards(SystemAdminGuard)
  @Get('admins')
  async findAllAdmins() {
    return this.systemAdminService.findAll();
  }

  @UseGuards(SystemAdminGuard)
  @Get('admins/:id')
  async findOneAdmin(@Param('id') id: string) {
    return this.systemAdminService.findOne(id);
  }

  @UseGuards(SystemAdminGuard)
  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateSystemAdminDto) {
    return this.systemAdminService.update(id, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    return this.systemAdminService.delete(id);
  }

  // ==================== Tenants ====================

  @UseGuards(SystemAdminGuard)
  @Post('tenants')
  async createTenant(@Body() dto: CreateTenantDto) {
    return this.systemAdminService.createTenant(dto);
  }

  @UseGuards(SystemAdminGuard)
  @Get('tenants')
  async findAllTenants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.systemAdminService.findAllTenants(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @UseGuards(SystemAdminGuard)
  @Get('tenants/:id')
  async findOneTenant(@Param('id') id: string) {
    return this.systemAdminService.findOneTenant(id);
  }

  @UseGuards(SystemAdminGuard)
  @Put('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.systemAdminService.updateTenant(id, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    return this.systemAdminService.deleteTenant(id);
  }

  // ==================== Users ====================

  @UseGuards(SystemAdminGuard)
  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.systemAdminService.createUser(dto);
  }

  @UseGuards(SystemAdminGuard)
  @Get('users')
  async findAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.systemAdminService.findAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(SystemAdminGuard)
  @Get('users/:id')
  async findOneUser(@Param('id') id: string) {
    return this.systemAdminService.findOneUser(id);
  }

  @UseGuards(SystemAdminGuard)
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.systemAdminService.updateUser(id, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.systemAdminService.deleteUser(id);
  }

  @UseGuards(SystemAdminGuard)
  @Post('users/:id/assign-tenant')
  async assignUserToTenant(@Param('id') id: string, @Body() dto: AssignTenantDto) {
    return this.systemAdminService.assignUserToTenant(id, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Delete('users/:userId/tenants/:tenantId')
  async removeUserFromTenant(
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.systemAdminService.removeUserFromTenant(userId, tenantId);
  }

  // Legacy routes for backward compatibility
  @UseGuards(SystemAdminGuard)
  @Post()
  async create(@Body() dto: CreateSystemAdminDto) {
    return this.systemAdminService.create(dto);
  }

  @UseGuards(SystemAdminGuard)
  @Get()
  async findAll() {
    return this.systemAdminService.findAll();
  }

  @UseGuards(SystemAdminGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.systemAdminService.findOne(id);
  }

  @UseGuards(SystemAdminGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSystemAdminDto) {
    return this.systemAdminService.update(id, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.systemAdminService.delete(id);
  }

  // ==================== System Settings ====================

  @UseGuards(SystemAdminGuard)
  @Get('settings')
  async getAllSettings() {
    return this.systemAdminService.getAllSettings();
  }

  @UseGuards(SystemAdminGuard)
  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    return this.systemAdminService.getSetting(key);
  }

  @UseGuards(SystemAdminGuard)
  @Put('settings/:key')
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateSystemSettingDto) {
    return this.systemAdminService.updateSetting(key, dto);
  }

  @UseGuards(SystemAdminGuard)
  @Post('settings/validate-release')
  async validateRelease(@Body() dto: ValidateReleaseDto) {
    return this.systemAdminService.validateGitHubRelease(dto);
  }
}
