import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res, Header as _Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Socks5PoolService } from './services/socks5-pool.service';
import { RelayService } from './services/relay.service';
import { SinglePortMultiEgressService } from './services/single-port-multi-egress.service';
import { LocationService } from './services/location.service';
import { OrderService } from './services/order.service';
import { SmartRelayService } from './services/smart-relay.service';
import { GoSeaSubscriptionService } from './services/gosea-subscription.service';
import { BatchSocks5Service } from './services/batch-socks5.service';
import { BatchRelayService } from './services/batch-relay.service';
import { GoSeaSettingsService } from './services/gosea-settings.service';
import { InstanceService } from './services/instance.service';
import { LineService } from './services/line.service';
import { AccountService } from './services/account.service';
import { AddToPoolDto, AllocateSocks5Dto, ReleaseSocks5Dto, CreateRelayDto, UpdateRelayDto, SinglePortMultiEgressDto } from './dto/gosea.dto';
import { BatchGenerateSocks5Dto, BatchGenerateRelayDto, BatchGenerateRelayAutoDto, GoSeaSettingsDto, NodeGoSeaConfigDto } from './dto/batch-generate.dto';
import { SearchInstancesDto, BatchChangeIpDto, BatchRenewDto, BatchUpdateCredentialsDto, SearchLinesDto } from './dto/instance.dto';
import { RequireScopes } from '../../modules/auth/decorators';
import { ScopesGuard } from '../../modules/auth/guards';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('GoSea Plugin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ScopesGuard)
@Controller('plugins/gosea')
export class GoSeaController {
  constructor(
    private socks5PoolService: Socks5PoolService,
    private relayService: RelayService,
    private singlePortMultiEgressService: SinglePortMultiEgressService,
    private locationService: LocationService,
    private orderService: OrderService,
    private smartRelayService: SmartRelayService,
    private subscriptionService: GoSeaSubscriptionService,
    private batchSocks5Service: BatchSocks5Service,
    private batchRelayService: BatchRelayService,
    private goSeaSettingsService: GoSeaSettingsService,
    private instanceService: InstanceService,
    private lineService: LineService,
    private accountService: AccountService,
  ) {}

  // ============================================
  // Socks5 Pool Management
  // ============================================

  @Post('pool')
  @ApiOperation({ summary: 'Add proxies to pool' })
  @RequireScopes('gosea:write')
  addToPool(@Req() req: AuthenticatedRequest, @Body() dto: AddToPoolDto) {
    return this.socks5PoolService.addToPool(req.user.tenantId, dto);
  }

  @Get('pool')
  @ApiOperation({ summary: 'List pool entries' })
  @RequireScopes('gosea:read')
  getPoolList(@Req() req: AuthenticatedRequest, @Query('status') status?: string, @Query('countryCode') countryCode?: string) {
    return this.socks5PoolService.getPoolList(req.user.tenantId, { status, countryCode });
  }

  @Delete('pool/:id')
  @ApiOperation({ summary: 'Delete pool entry' })
  @RequireScopes('gosea:write')
  deleteFromPool(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.socks5PoolService.deleteFromPool(req.user.tenantId, id);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory summary' })
  @RequireScopes('gosea:read')
  getInventory(@Req() req: AuthenticatedRequest) {
    return this.socks5PoolService.getInventory(req.user.tenantId);
  }

  // ============================================
  // Socks5 Allocation
  // ============================================

  @Post('allocate')
  @ApiOperation({ summary: 'Allocate socks5 proxies' })
  @RequireScopes('gosea:write')
  allocate(@Req() req: AuthenticatedRequest, @Body() dto: AllocateSocks5Dto) {
    return this.socks5PoolService.allocate(req.user.tenantId, dto);
  }

  @Post('release')
  @ApiOperation({ summary: 'Release allocations' })
  @RequireScopes('gosea:write')
  release(@Req() req: AuthenticatedRequest, @Body() dto: ReleaseSocks5Dto) {
    return this.socks5PoolService.release(req.user.tenantId, dto);
  }

  @Get('allocations')
  @ApiOperation({ summary: 'List allocations' })
  @RequireScopes('gosea:read')
  getAllocations(@Req() req: AuthenticatedRequest, @Query('status') status?: string, @Query('externalOrderId') externalOrderId?: string) {
    return this.socks5PoolService.getAllocations(req.user.tenantId, { status, externalOrderId });
  }

  // ============================================
  // Relay Management
  // ============================================

  @Post('relay')
  @ApiOperation({ summary: 'Create relay endpoint' })
  @RequireScopes('gosea:write')
  createRelay(@Req() req: AuthenticatedRequest, @Body() dto: CreateRelayDto) {
    return this.relayService.createRelay(req.user.tenantId, dto);
  }

  @Get('relay')
  @ApiOperation({ summary: 'List relay endpoints' })
  @RequireScopes('gosea:read')
  listRelays(@Req() req: AuthenticatedRequest, @Query('status') status?: string, @Query('externalOrderId') externalOrderId?: string) {
    return this.relayService.listRelays(req.user.tenantId, { status, externalOrderId });
  }

  @Get('relay/:id')
  @ApiOperation({ summary: 'Get relay by ID' })
  @RequireScopes('gosea:read')
  getRelay(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.relayService.getRelay(req.user.tenantId, id);
  }

  @Put('relay/:id')
  @ApiOperation({ summary: 'Update relay' })
  @RequireScopes('gosea:write')
  updateRelay(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateRelayDto) {
    return this.relayService.updateRelay(req.user.tenantId, id, dto);
  }

  @Delete('relay/:id')
  @ApiOperation({ summary: 'Delete relay' })
  @RequireScopes('gosea:write')
  deleteRelay(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.relayService.deleteRelay(req.user.tenantId, id);
  }

  // ============================================
  // Single Port Multi-Egress
  // ============================================

  @Post('single-port-multi-egress')
  @ApiOperation({ summary: 'Generate single-port multi-egress proxies (user:pass routes to different egress IPs)' })
  @RequireScopes('gosea:write')
  generateSinglePortMultiEgress(@Req() req: AuthenticatedRequest, @Body() dto: SinglePortMultiEgressDto) {
    return this.singlePortMultiEgressService.generate(req.user.tenantId, dto);
  }

  // ============================================
  // Export
  // ============================================

  @Get('export')
  @ApiOperation({ summary: 'Export proxies in txt/csv/json format' })
  @RequireScopes('gosea:read')
  async exportProxies(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('nodeId') nodeId: string,
    @Query('format') format: 'txt' | 'csv' | 'json' = 'txt',
  ) {
    const content = await this.singlePortMultiEgressService.exportProxies(req.user.tenantId, nodeId, format);
    
    const contentTypes: Record<string, string> = {
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
    };
    
    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="proxies.${format}"`);
    res.send(content);
  }

  // ============================================
  // Location & Inventory (ipipdcn style)
  // ============================================

  @Get('locations')
  @ApiOperation({ summary: 'Get all locations tree (continent/country/city)' })
  @RequireScopes('gosea:read')
  getLocationsTree(@Req() req: AuthenticatedRequest) {
    return this.locationService.getLocationsTree(req.user.tenantId);
  }

  @Get('locations/available')
  @ApiOperation({ summary: 'Get available locations with inventory' })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'ispType', required: false })
  @RequireScopes('gosea:read')
  getAvailableLocations(@Req() req: AuthenticatedRequest, @Query('countryCode') countryCode?: string, @Query('ispType') ispType?: string) {
    return this.locationService.getAvailableLocations(req.user.tenantId, { countryCode, ispType });
  }

  @Get('inventory/:countryCode')
  @ApiOperation({ summary: 'Get inventory by country (city breakdown)' })
  @RequireScopes('gosea:read')
  getInventoryByCountry(@Req() req: AuthenticatedRequest, @Param('countryCode') countryCode: string) {
    return this.locationService.getInventoryByCountry(req.user.tenantId, countryCode);
  }

  // ============================================
  // Order Management (ipipdcn style)
  // ============================================

  @Post('orders/create')
  @ApiOperation({ summary: 'Create order (allocate socks5 + create relay)' })
  @RequireScopes('gosea:write')
  createOrder(@Req() req: AuthenticatedRequest, @Body() dto: any) {
    return this.orderService.createOrder(req.user.tenantId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'size', required: false })
  @RequireScopes('gosea:read')
  listOrders(@Req() req: AuthenticatedRequest, @Query('status') status?: string, @Query('page') page?: string, @Query('size') size?: string) {
    return this.orderService.listOrders(req.user.tenantId, { status, page: page ? parseInt(page) : undefined, size: size ? parseInt(size) : undefined });
  }

  @Get('orders/:orderNo')
  @ApiOperation({ summary: 'Get order by orderNo' })
  @RequireScopes('gosea:read')
  getOrder(@Req() req: AuthenticatedRequest, @Param('orderNo') orderNo: string) {
    return this.orderService.getOrder(req.user.tenantId, orderNo);
  }

  // ============================================
  // Smart Relay (auto node selection)
  // ============================================

  @Post('relay/smart-create')
  @ApiOperation({ summary: 'Smart create relay (auto select optimal node)' })
  @RequireScopes('gosea:write')
  smartCreateRelay(@Req() req: AuthenticatedRequest, @Body() dto: any) {
    return this.smartRelayService.smartCreate(req.user.tenantId, dto);
  }

  @Put('relay/:id/protocol')
  @ApiOperation({ summary: 'Switch relay protocol' })
  @RequireScopes('gosea:write')
  switchProtocol(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: any) {
    return this.smartRelayService.switchProtocol(req.user.tenantId, id, dto);
  }

  @Get('relay/:id/link')
  @ApiOperation({ summary: 'Get relay connection link' })
  @RequireScopes('gosea:read')
  getRelayLink(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.smartRelayService.getRelayLink(req.user.tenantId, id);
  }

  // ============================================
  // Subscription Links
  // ============================================

  @Post('subscription/generate')
  @ApiOperation({ summary: 'Generate subscription token' })
  @RequireScopes('gosea:write')
  generateSubscription(@Req() req: AuthenticatedRequest, @Body() dto: any) {
    return this.subscriptionService.generateSubscription(req.user.tenantId, dto);
  }

  @Get('subscription/:token')
  @ApiOperation({ summary: 'Get subscription content (public)' })
  @ApiQuery({ name: 'format', required: false, enum: ['clash', 'v2ray', 'singbox', 'shadowrocket', 'link', 'json'] })
  async getSubscription(@Param('token') token: string, @Query('format') format?: string, @Res() res?: Response) {
    const content = await this.subscriptionService.getSubscription(token, format as any || 'clash');
    if (res) {
      const contentType = format === 'json' ? 'application/json' : 'text/plain; charset=utf-8';
      res.setHeader('Content-Type', contentType);
      res.send(content);
    }
    return content;
  }

  // ============================================
  // Batch Generate Socks5
  // ============================================

  @Post('socks5/batch-generate')
  @ApiOperation({ summary: 'Batch generate Socks5 proxies with preview' })
  @RequireScopes('gosea:write')
  batchGenerateSocks5(@Req() req: AuthenticatedRequest, @Body() dto: BatchGenerateSocks5Dto) {
    return this.batchSocks5Service.generate(req.user.tenantId, dto);
  }

  // ============================================
  // Batch Generate Relay
  // ============================================

  @Post('relay/batch-generate')
  @ApiOperation({ summary: 'Batch generate relay endpoints from Socks5 list' })
  @RequireScopes('gosea:write')
  batchGenerateRelay(@Req() req: AuthenticatedRequest, @Body() dto: BatchGenerateRelayDto) {
    return this.batchRelayService.generate(req.user.tenantId, dto);
  }

  @Post('relay/batch-generate-auto')
  @ApiOperation({ summary: 'Auto-generate relay endpoints from existing Socks5 nodes' })
  @RequireScopes('gosea:write')
  batchGenerateRelayAuto(@Req() req: AuthenticatedRequest, @Body() dto: BatchGenerateRelayAutoDto) {
    return this.batchRelayService.generateAuto(req.user.tenantId, dto);
  }

  // ============================================
  // GoSea Settings
  // ============================================

  @Get('settings')
  @ApiOperation({ summary: 'Get GoSea plugin settings' })
  @RequireScopes('gosea:read')
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.goSeaSettingsService.getSettings(req.user.tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update GoSea plugin settings' })
  @RequireScopes('gosea:write')
  updateSettings(@Req() req: AuthenticatedRequest, @Body() dto: GoSeaSettingsDto) {
    return this.goSeaSettingsService.updateSettings(req.user.tenantId, dto);
  }

  // ============================================
  // Node GoSea Config
  // ============================================

  @Get('nodes/:nodeId/config')
  @ApiOperation({ summary: 'Get node GoSea config (port ranges, ingress IPs)' })
  @RequireScopes('gosea:read')
  getNodeGoSeaConfig(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string) {
    return this.goSeaSettingsService.getNodeGoSeaConfig(req.user.tenantId, nodeId);
  }

  @Put('nodes/:nodeId/config')
  @ApiOperation({ summary: 'Update node GoSea config' })
  @RequireScopes('gosea:write')
  updateNodeGoSeaConfig(@Req() req: AuthenticatedRequest, @Param('nodeId') nodeId: string, @Body() dto: NodeGoSeaConfigDto) {
    return this.goSeaSettingsService.updateNodeGoSeaConfig(req.user.tenantId, nodeId, dto);
  }

  // ============================================
  // ipipdcn Style APIs - Business Types
  // ============================================

  @Get('business-types')
  @ApiOperation({ summary: 'Get all business types (ipipdcn style)' })
  @RequireScopes('gosea:read')
  getBusinessTypes(@Req() req: AuthenticatedRequest) {
    return this.lineService.getBusinessTypes(req.user.tenantId);
  }

  // ============================================
  // ipipdcn Style APIs - Instance Management
  // ============================================

  @Post('instances')
  @ApiOperation({ summary: 'Search proxy instances (ipipdcn style)' })
  @RequireScopes('gosea:read')
  searchInstances(@Req() req: AuthenticatedRequest, @Body() dto: SearchInstancesDto) {
    return this.instanceService.searchInstances(req.user.tenantId, dto);
  }

  @Post('instances/change-ip')
  @ApiOperation({ summary: 'Batch change IP for instances (ipipdcn style)' })
  @RequireScopes('gosea:write')
  batchChangeIp(@Req() req: AuthenticatedRequest, @Body() dto: BatchChangeIpDto) {
    return this.instanceService.batchChangeIp(req.user.tenantId, dto);
  }

  @Post('instances/renew')
  @ApiOperation({ summary: 'Batch renew instances (ipipdcn style)' })
  @RequireScopes('gosea:write')
  batchRenew(@Req() req: AuthenticatedRequest, @Body() dto: BatchRenewDto) {
    return this.instanceService.batchRenew(req.user.tenantId, dto);
  }

  @Post('instances/update-credentials')
  @ApiOperation({ summary: 'Batch update credentials (ipipdcn style)' })
  @RequireScopes('gosea:write')
  batchUpdateCredentials(@Req() req: AuthenticatedRequest, @Body() dto: BatchUpdateCredentialsDto) {
    return this.instanceService.batchUpdateCredentials(req.user.tenantId, dto);
  }

  // ============================================
  // ipipdcn Style APIs - Lines
  // ============================================

  @Post('lines')
  @ApiOperation({ summary: 'Search available lines (ipipdcn style)' })
  @RequireScopes('gosea:read')
  searchLines(@Req() req: AuthenticatedRequest, @Body() dto: SearchLinesDto) {
    return this.lineService.searchLines(req.user.tenantId, dto);
  }

  // ============================================
  // ipipdcn Style APIs - Account
  // ============================================

  @Get('account')
  @ApiOperation({ summary: 'Get account info (ipipdcn style)' })
  @RequireScopes('gosea:read')
  getAccountInfo(@Req() req: AuthenticatedRequest) {
    return this.accountService.getAccountInfo(req.user.tenantId, (req.user as any).userId || req.user.sub);
  }
}
