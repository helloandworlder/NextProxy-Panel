import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DnsService } from './dns.service';
import { CreateDnsProviderDto, UpdateDnsProviderDto, CreateDnsRecordDto, UpdateDnsRecordDto } from './dto/dns.dto';
import { RequireScopes } from '../auth/decorators';
import { ScopesGuard } from '../auth/guards';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('DNS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ScopesGuard)
@Controller('dns')
export class DnsController {
  constructor(private dnsService: DnsService) {}

  // ============================================
  // DNS Provider Endpoints
  // ============================================

  @Post('providers')
  @ApiOperation({ summary: 'Create DNS provider' })
  @RequireScopes('dns:write')
  createProvider(@Req() req: AuthenticatedRequest, @Body() dto: CreateDnsProviderDto) {
    return this.dnsService.createProvider(req.user.tenantId, dto);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List DNS providers' })
  @RequireScopes('dns:read')
  findAllProviders(@Req() req: AuthenticatedRequest) {
    return this.dnsService.findAllProviders(req.user.tenantId);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get DNS provider by ID' })
  @RequireScopes('dns:read')
  findProviderById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsService.findProviderById(req.user.tenantId, id);
  }

  @Put('providers/:id')
  @ApiOperation({ summary: 'Update DNS provider' })
  @RequireScopes('dns:write')
  updateProvider(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateDnsProviderDto) {
    return this.dnsService.updateProvider(req.user.tenantId, id, dto);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Delete DNS provider' })
  @RequireScopes('dns:write')
  deleteProvider(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsService.deleteProvider(req.user.tenantId, id);
  }

  // ============================================
  // DNS Record Endpoints
  // ============================================

  @Post('records')
  @ApiOperation({ summary: 'Create DNS record' })
  @RequireScopes('dns:write')
  createRecord(@Req() req: AuthenticatedRequest, @Body() dto: CreateDnsRecordDto) {
    return this.dnsService.createRecord(req.user.tenantId, dto);
  }

  @Get('records')
  @ApiOperation({ summary: 'List DNS records' })
  @RequireScopes('dns:read')
  findAllRecords(@Req() req: AuthenticatedRequest, @Query('providerId') providerId?: string, @Query('nodeId') nodeId?: string) {
    return this.dnsService.findAllRecords(req.user.tenantId, providerId, nodeId);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get DNS record by ID' })
  @RequireScopes('dns:read')
  findRecordById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsService.findRecordById(req.user.tenantId, id);
  }

  @Put('records/:id')
  @ApiOperation({ summary: 'Update DNS record' })
  @RequireScopes('dns:write')
  updateRecord(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateDnsRecordDto) {
    return this.dnsService.updateRecord(req.user.tenantId, id, dto);
  }

  @Delete('records/:id')
  @ApiOperation({ summary: 'Delete DNS record' })
  @RequireScopes('dns:write')
  deleteRecord(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsService.deleteRecord(req.user.tenantId, id);
  }

  // ============================================
  // Node Domain Management
  // ============================================

  @Post('nodes/:nodeId/domain')
  @ApiOperation({ summary: 'Ensure node has a DNS domain' })
  @RequireScopes('dns:write')
  ensureNodeDomain(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.dnsService.ensureNodeDomain(req.user.tenantId, nodeId);
  }

  @Delete('nodes/:nodeId/domain')
  @ApiOperation({ summary: 'Remove node DNS domain' })
  @RequireScopes('dns:write')
  removeNodeDomain(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.dnsService.removeNodeDomain(req.user.tenantId, nodeId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync all DNS records with providers' })
  @RequireScopes('dns:write')
  syncAllRecords(@Req() req: AuthenticatedRequest) {
    return this.dnsService.syncAllRecords(req.user.tenantId);
  }
}
