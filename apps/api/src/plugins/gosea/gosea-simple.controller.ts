import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Socks5GenerateService } from './services/socks5-generate.service';
import { RelayGenerateService } from './services/relay-generate.service';
import { SinglePortMultiEgressService } from './services/single-port-multi-egress.service';
import { GenerateSocks5Dto, CreateRelayDto } from './dto/gosea-simple.dto';
import { SinglePortMultiEgressDto } from './dto/gosea.dto';
import { RequireScopes } from '../../modules/auth/decorators';
import { ScopesGuard } from '../../modules/auth/guards';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('GoSea Plugin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), ScopesGuard)
@Controller('plugins/gosea')
export class GoSeaSimpleController {
  constructor(
    private socks5Service: Socks5GenerateService,
    private relayService: RelayGenerateService,
    private singlePortMultiEgressService: SinglePortMultiEgressService,
  ) {}

  // ============================================
  // Socks5 Generation
  // ============================================

  @Post('socks5/generate')
  @ApiOperation({ summary: 'Generate Socks5 proxies on a node' })
  @RequireScopes('gosea:write')
  generateSocks5(@Req() req: AuthenticatedRequest, @Body() dto: GenerateSocks5Dto) {
    return this.socks5Service.generate(req.user.tenantId, dto);
  }

  @Get('socks5')
  @ApiOperation({ summary: 'List generated Socks5 entries' })
  @RequireScopes('gosea:read')
  listSocks5(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.socks5Service.list(req.user.tenantId, nodeId);
  }

  @Delete('socks5/:id')
  @ApiOperation({ summary: 'Delete a Socks5 entry' })
  @RequireScopes('gosea:write')
  deleteSocks5(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.socks5Service.delete(req.user.tenantId, id);
  }

  // ============================================
  // Relay Management
  // ============================================

  @Post('relay/create')
  @ApiOperation({ summary: 'Create a relay endpoint (VLESS/VMess/SS -> Socks5)' })
  @RequireScopes('gosea:write')
  createRelay(@Req() req: AuthenticatedRequest, @Body() dto: CreateRelayDto) {
    return this.relayService.create(req.user.tenantId, dto);
  }

  @Get('relay')
  @ApiOperation({ summary: 'List relay endpoints' })
  @RequireScopes('gosea:read')
  listRelays(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.relayService.list(req.user.tenantId, nodeId);
  }

  @Delete('relay/:id')
  @ApiOperation({ summary: 'Delete a relay endpoint' })
  @RequireScopes('gosea:write')
  deleteRelay(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.relayService.delete(req.user.tenantId, id);
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
}
