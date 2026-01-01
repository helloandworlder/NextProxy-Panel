import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NodeGroupService } from './node-group.service';
import { CreateNodeGroupDto, UpdateNodeGroupDto } from './dto/node-group.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Node Groups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('node-groups')
export class NodeGroupController {
  constructor(private readonly nodeGroupService: NodeGroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create node group' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateNodeGroupDto) {
    return this.nodeGroupService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List node groups' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.nodeGroupService.findAll(req.user.tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available node group templates' })
  getTemplates() {
    return this.nodeGroupService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node group' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeGroupService.findOne(req.user.tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get node group load balancing statistics' })
  getStats(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeGroupService.getGroupStats(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update node group' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateNodeGroupDto) {
    return this.nodeGroupService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node group' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeGroupService.delete(req.user.tenantId, id);
  }

  @Post(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Add node to group' })
  addNode(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('nodeId') nodeId: string) {
    return this.nodeGroupService.addNode(req.user.tenantId, id, nodeId);
  }

  @Delete(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Remove node from group' })
  removeNode(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('nodeId') nodeId: string) {
    return this.nodeGroupService.removeNode(req.user.tenantId, id, nodeId);
  }
}
