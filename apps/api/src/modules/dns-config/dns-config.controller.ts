import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DnsConfigService } from './dns-config.service';
import { CreateDnsConfigDto, UpdateDnsConfigDto } from './dto/dns-config.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('DNS Configs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dns-configs')
export class DnsConfigController {
  constructor(private readonly dnsConfigService: DnsConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create DNS config' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDnsConfigDto) {
    return this.dnsConfigService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List DNS configs' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.dnsConfigService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get DNS config' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsConfigService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update DNS config' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateDnsConfigDto) {
    return this.dnsConfigService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete DNS config' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dnsConfigService.delete(req.user.tenantId, id);
  }
}
