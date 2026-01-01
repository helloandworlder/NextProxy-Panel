import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';
import { AuthenticatedRequest } from '../../common/interfaces/request.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryAuditLogDto) {
    return this.auditLogService.findAll(req.user.tenantId, query);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get distinct actions' })
  getActions(@Req() req: AuthenticatedRequest) {
    return this.auditLogService.getActions(req.user.tenantId);
  }

  @Get('resource-types')
  @ApiOperation({ summary: 'Get distinct resource types' })
  getResourceTypes(@Req() req: AuthenticatedRequest) {
    return this.auditLogService.getResourceTypes(req.user.tenantId);
  }
}
