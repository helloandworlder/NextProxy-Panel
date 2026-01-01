import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ClientServiceV3 } from './client.service';
import { CreateClientDto, UpdateClientDto, BulkCreateClientsDto } from './dto/client.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/clients')
export class ClientController {
  constructor(private clientService: ClientServiceV3) {}

  @Post()
  @ApiOperation({ summary: 'Create client' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateClientDto) {
    return this.clientService.create(req.user.tenantId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create clients (3x-ui style)' })
  bulkCreate(@Req() req: AuthenticatedRequest, @Body() dto: BulkCreateClientsDto) {
    return this.clientService.bulkCreate(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(@Req() req: AuthenticatedRequest, @Query('enable') enable?: string, @Query('subId') subId?: string) {
    return this.clientService.findAll(req.user.tenantId, {
      enable: enable !== undefined ? enable === 'true' : undefined,
      subId,
    });
  }

  @Get('online')
  @ApiOperation({ summary: 'Get online clients with active IPs' })
  getOnlineClients(@Req() req: AuthenticatedRequest) {
    return this.clientService.getOnlineClients(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update client' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.delete(req.user.tenantId, id);
  }

  @Post(':id/reset-traffic')
  @ApiOperation({ summary: 'Reset client traffic' })
  resetTraffic(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.resetTraffic(req.user.tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get client stats' })
  getStats(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.getStats(req.user.tenantId, id);
  }

  // IP Tracking endpoints (3x-ui style)
  @Get(':id/ips')
  @ApiOperation({ summary: 'Get client IP logs' })
  getClientIps(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.getClientIps(req.user.tenantId, id);
  }

  @Delete(':id/ips')
  @ApiOperation({ summary: 'Clear client IP logs' })
  clearClientIps(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.clientService.clearClientIps(req.user.tenantId, id);
  }
}
