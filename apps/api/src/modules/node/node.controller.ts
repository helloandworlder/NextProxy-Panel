import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NodeService } from './node.service';
import { CreateNodeDto, UpdateNodeDto, QuickCreateNodeDto } from './dto/node.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Nodes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('nodes')
export class NodeController {
  constructor(private nodeService: NodeService) {}

  @Post('quick')
  @ApiOperation({ summary: 'Quick create node - only name required, returns install command' })
  quickCreate(@Req() req: AuthenticatedRequest, @Body() dto: QuickCreateNodeDto) {
    return this.nodeService.quickCreate(req.user.tenantId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new node' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateNodeDto) {
    return this.nodeService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all nodes' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('countryCode') countryCode?: string,
    @Query('nodeGroupId') nodeGroupId?: string,
  ) {
    return this.nodeService.findAll(req.user.tenantId, { status, countryCode, nodeGroupId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get node by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeService.findOne(req.user.tenantId, id);
  }

  @Get(':id/install-command')
  @ApiOperation({ summary: 'Get install command for node' })
  getInstallCommand(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeService.getInstallCommand(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update node' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return this.nodeService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete node' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeService.delete(req.user.tenantId, id);
  }

  @Post(':id/regenerate-token')
  @ApiOperation({ summary: 'Regenerate node token' })
  regenerateToken(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeService.regenerateToken(req.user.tenantId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Force sync node configuration - invalidates cache and triggers config refresh' })
  syncNode(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nodeService.syncNode(req.user.tenantId, id);
  }
}
