import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BalancerService } from './balancer.service';
import { CreateBalancerDto, UpdateBalancerDto } from './dto/balancer.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Balancers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('balancers')
export class BalancerController {
  constructor(private readonly balancerService: BalancerService) {}

  @Post()
  @ApiOperation({ summary: 'Create balancer' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBalancerDto) {
    return this.balancerService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List balancers' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.balancerService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get balancer' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.balancerService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update balancer' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateBalancerDto) {
    return this.balancerService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete balancer' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.balancerService.delete(req.user.tenantId, id);
  }
}
