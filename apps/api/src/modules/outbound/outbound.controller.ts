import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OutboundService } from './outbound.service';
import { CreateOutboundDto, UpdateOutboundDto } from './dto/outbound.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Outbounds')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('outbounds')
export class OutboundController {
  constructor(private outboundService: OutboundService) {}

  @Post()
  @ApiOperation({ summary: 'Create outbound' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOutboundDto) {
    return this.outboundService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List outbounds' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.outboundService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get outbound by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.outboundService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update outbound' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateOutboundDto) {
    return this.outboundService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete outbound' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.outboundService.delete(req.user.tenantId, id);
  }
}
