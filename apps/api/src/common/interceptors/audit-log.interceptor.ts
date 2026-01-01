import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditUser {
  userId?: string;
  tenantId?: string;
  apiKeyId?: string;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(AuditLogInterceptor.name)
    private readonly logger: PinoLogger,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit POST, PUT, PATCH, DELETE
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Skip auth endpoints
    const path = request.route?.path || request.url;
    if (path.includes('/auth/')) {
      return next.handle();
    }

    const user = request.user as AuditUser | undefined;
    if (!user?.tenantId) {
      return next.handle();
    }

    const action = this.getAction(method);
    const { resourceType, resourceId } = this.parseResource(path, request.params);
    const ip = request.ip || request.headers['x-forwarded-for']?.toString() || '';
    const userAgent = request.headers['user-agent'] || '';
    const beforeData = request.body;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: user.tenantId!,
              userId: user.userId || null,
              apiKeyId: user.apiKeyId || null,
              action,
              resourceType,
              resourceId: resourceId || (response as { id?: string })?.id || null,
              changes: {
                before: method === 'POST' ? null : beforeData,
                after: response as object ?? null,
              } as object,
              ip,
              userAgent,
            },
          });
        } catch (error) {
          this.logger.error({ err: error }, 'Failed to create audit log');
        }
      }),
    );
  }

  private getAction(method: string): string {
    switch (method) {
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return method.toLowerCase();
    }
  }

  private parseResource(path: string, params: Record<string, string>): { resourceType: string; resourceId: string | null } {
    // Extract resource type from path: /api/v1/nodes/:id -> nodes
    const segments = path.split('/').filter(Boolean);
    let resourceType = 'unknown';
    
    for (const segment of segments) {
      if (!segment.startsWith(':') && !['api', 'v1', 'agent'].includes(segment)) {
        resourceType = segment.replace(/-/g, '_');
        break;
      }
    }

    const resourceId = params?.id || params?.nodeId || params?.clientId || null;
    return { resourceType, resourceId };
  }
}
