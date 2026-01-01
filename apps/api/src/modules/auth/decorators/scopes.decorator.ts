import { SetMetadata } from '@nestjs/common';

export const SCOPES_KEY = 'scopes';

/**
 * Decorator to specify required scopes for an endpoint
 * @param scopes - Array of required scopes (e.g., 'nodes:read', 'clients:write')
 * 
 * Scope format: 'resource:action'
 * - resources: nodes, inbounds, outbounds, clients, routing, stats, tenants
 * - actions: read, write
 * - '*' means all permissions
 * 
 * @example
 * @RequireScopes('nodes:read')
 * @RequireScopes('clients:read', 'clients:write')
 */
export const RequireScopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);
