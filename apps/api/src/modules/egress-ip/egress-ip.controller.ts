import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EgressIpService } from './egress-ip.service';
import { CreateEgressIpDto, UpdateEgressIpDto, QueryEgressIpDto, QueryAvailableEgressIpDto } from './dto/egress-ip.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Egress IPs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('egress-ips')
export class EgressIpController {
  constructor(private egressIpService: EgressIpService) {}

  @Post()
  @ApiOperation({ summary: 'Create egress IP' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEgressIpDto) {
    return this.egressIpService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all egress IPs' })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryEgressIpDto) {
    return this.egressIpService.findAll(req.user.tenantId, query);
  }

  @Get('available')
  @ApiOperation({ summary: 'List available egress IPs (for overselling)' })
  findAvailable(@Req() req: AuthenticatedRequest, @Query() query: QueryAvailableEgressIpDto) {
    return this.egressIpService.findAvailable(req.user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get egress IP by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.egressIpService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update egress IP' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateEgressIpDto) {
    return this.egressIpService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete egress IP' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.egressIpService.delete(req.user.tenantId, id);
  }

  @Post(':id/increment-users')
  @ApiOperation({ summary: 'Increment user count for egress IP' })
  incrementUsers(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.egressIpService.incrementUsers(req.user.tenantId, id);
  }

  @Post(':id/decrement-users')
  @ApiOperation({ summary: 'Decrement user count for egress IP' })
  decrementUsers(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.egressIpService.decrementUsers(req.user.tenantId, id);
  }
}
