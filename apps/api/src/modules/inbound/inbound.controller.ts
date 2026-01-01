import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InboundServiceV3 } from './inbound.service';
import { CreateInboundDto, UpdateInboundDto } from './dto/inbound.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Inbounds')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/inbounds')
export class InboundController {
  constructor(private inboundService: InboundServiceV3) {}

  @Post()
  @ApiOperation({ summary: 'Create inbound' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateInboundDto) {
    return this.inboundService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inbounds' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.inboundService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inbound by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.inboundService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update inbound' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateInboundDto) {
    return this.inboundService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inbound' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.inboundService.delete(req.user.tenantId, id);
  }
}
