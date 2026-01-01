import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PolicyConfigService } from './policy-config.service';
import { CreatePolicyConfigDto, UpdatePolicyConfigDto } from './dto/policy-config.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Policy Configs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('policy-configs')
export class PolicyConfigController {
  constructor(private readonly policyConfigService: PolicyConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create policy config' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePolicyConfigDto) {
    return this.policyConfigService.create(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List policy configs' })
  findAll(@Req() req: AuthenticatedRequest, @Query('nodeId') nodeId?: string) {
    return this.policyConfigService.findAll(req.user.tenantId, nodeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy config' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.policyConfigService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update policy config' })
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdatePolicyConfigDto) {
    return this.policyConfigService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete policy config' })
  delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.policyConfigService.delete(req.user.tenantId, id);
  }
}
