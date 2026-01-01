import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoutingService } from './routing.service';
import { CreateRoutingRuleDto, UpdateRoutingRuleDto } from './dto/routing.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Routing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('routing-rules')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Post()
  @ApiOperation({ summary: 'Create routing rule' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoutingRuleDto) {
    return this.routingService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List routing rules' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.routingService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get routing rule by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.routingService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update routing rule' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateRoutingRuleDto) {
    return this.routingService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete routing rule' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.routingService.delete(req.user.tenantId, id);
  }
}
