import { Request } from 'express';

/**
 * JWT Payload for tenant users (re-exported from auth.service for convenience)
 */
export interface JwtPayload {
  sub: string;        // userId
  tenantId: string;   // 当前租户 ID
  username: string;
  role: string;
}

/**
 * Authenticated request with JWT user payload
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * JWT Payload for Agent (node) authentication
 */
export interface AgentJwtPayload {
  nodeId: string;
  tenantId: string;
}

/**
 * Agent authenticated request
 */
export interface AgentAuthenticatedRequest extends Request {
  user: AgentJwtPayload;
}
