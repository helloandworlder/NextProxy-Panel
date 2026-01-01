import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // JWT users (TenantUser) have full access within their tenant
    if (user && !user.apiKeyId) {
      return true;
    }

    // API Key users need scope validation
    if (user && user.apiKeyId && user.scopes) {
      const userScopes = user.scopes as string[];
      
      // Wildcard scope grants all permissions
      if (userScopes.includes('*')) {
        return true;
      }

      // Check if user has all required scopes
      const hasAllScopes = requiredScopes.every((scope) => {
        // Direct match
        if (userScopes.includes(scope)) return true;
        
        // Check for resource wildcard (e.g., 'nodes:*' matches 'nodes:read')
        const [resource, action] = scope.split(':');
        if (userScopes.includes(`${resource}:*`)) return true;
        
        // Check for action wildcard (e.g., '*:read' matches 'nodes:read')
        if (userScopes.includes(`*:${action}`)) return true;
        
        return false;
      });

      if (!hasAllScopes) {
        throw new ForbiddenException(
          `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        );
      }

      return true;
    }

    throw new ForbiddenException('Access denied');
  }
}
