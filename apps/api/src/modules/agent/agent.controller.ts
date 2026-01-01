/**
 * Agent Controller v3 - RESTful API for Agent
 * Adapted for new schema (Client.inboundTags, no ClientInboundAccess)
 */

import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { AgentServiceV3 } from './agent.service';
import { 
  ReportTrafficDto, 
  ReportStatusDto, 
  ReportAliveDto, 
  ReportEgressIpsDto, 
  RegisterNodeDto,
  ConfigResponse,
  UsersResponse,
  RegisterResponse,
} from './dto/agent.dto';
import { AgentAuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Agent API v1')
@Controller('agent')
@SkipThrottle()
export class AgentControllerV3 {
  constructor(private agentService: AgentServiceV3) {}

  /**
   * GET /api/v1/agent/config
   * Returns complete Xray configuration (Panel generates, Agent pulls)
   */
  @Get('config')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Get complete Xray configuration' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  @ApiHeader({ name: 'If-None-Match', required: false, description: 'ETag for caching' })
  @ApiResponse({ status: 200, type: ConfigResponse })
  @ApiResponse({ status: 304, description: 'Not Modified' })
  async getConfig(
    @Req() req: AgentAuthenticatedRequest,
    @Headers('if-none-match') etag?: string,
  ) {
    const result = await this.agentService.getNodeConfig(req.user.nodeId, etag);
    
    if (result.notModified) {
      throw new HttpException('Not Modified', HttpStatus.NOT_MODIFIED);
    }
    
    return { config: result.config, etag: result.etag };
  }

  /**
   * GET /api/v1/agent/users
   * Returns valid users for hot-reload
   */
  @Get('users')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Get valid users list for hot-reload' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  @ApiHeader({ name: 'If-None-Match', required: false })
  @ApiResponse({ status: 200, type: UsersResponse })
  @ApiResponse({ status: 304, description: 'Not Modified' })
  async getUsers(
    @Req() req: AgentAuthenticatedRequest,
    @Headers('if-none-match') etag?: string,
  ) {
    const result = await this.agentService.getNodeUsers(req.user.nodeId, etag);
    
    if (result.notModified) {
      throw new HttpException('Not Modified', HttpStatus.NOT_MODIFIED);
    }
    
    return { users: result.users, rateLimits: result.rateLimits, etag: result.etag };
  }

  /**
   * POST /api/v1/agent/traffic
   * Report traffic statistics (batch)
   */
  @Post('traffic')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Report traffic statistics' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  async reportTraffic(
    @Req() req: AgentAuthenticatedRequest, 
    @Body() dto: ReportTrafficDto,
  ) {
    return this.agentService.reportTraffic(req.user.nodeId, dto.traffics);
  }

  /**
   * POST /api/v1/agent/status
   * Report node status
   */
  @Post('status')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Report node status' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  async reportStatus(
    @Req() req: AgentAuthenticatedRequest, 
    @Body() dto: ReportStatusDto,
  ) {
    return this.agentService.reportStatus(req.user.nodeId, dto);
  }

  /**
   * POST /api/v1/agent/alive
   * Report alive users (for device limit enforcement)
   */
  @Post('alive')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Report alive users for device limit' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  async reportAlive(
    @Req() req: AgentAuthenticatedRequest, 
    @Body() dto: ReportAliveDto,
  ) {
    return this.agentService.reportAlive(req.user.nodeId, dto.aliveUsers);
  }

  /**
   * POST /api/v1/agent/egress-ips
   * Report egress IPs
   */
  @Post('egress-ips')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Report egress IPs' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  async reportEgressIps(
    @Req() req: AgentAuthenticatedRequest, 
    @Body() dto: ReportEgressIpsDto,
  ) {
    return this.agentService.reportEgressIps(req.user.nodeId, dto.ips);
  }

  /**
   * POST /api/v1/agent/register
   * Register node on startup
   */
  @Post('register')
  @UseGuards(AuthGuard('node-token'))
  @ApiOperation({ summary: 'Register node' })
  @ApiHeader({ name: 'X-Node-Token', required: true })
  @ApiResponse({ status: 200, type: RegisterResponse })
  async register(
    @Req() req: AgentAuthenticatedRequest, 
    @Body() dto: RegisterNodeDto,
  ) {
    return this.agentService.registerNode(req.user.nodeId, dto);
  }
}
