import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopesGuard } from '../guards/scopes.guard';
import { createMockExecutionContext, createMockReflector } from '../../../../test/helpers/mock-factory';

describe('ScopesGuard', () => {
  let guard: ScopesGuard;
  let reflector: ReturnType<typeof createMockReflector>;

  beforeEach(async () => {
    reflector = createMockReflector();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<ScopesGuard>(ScopesGuard);
  });

  afterEach(() => jest.clearAllMocks());

  describe('canActivate', () => {
    it('should allow access when no scopes are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ user: { apiKeyId: 'key-001', scopes: [] } });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow JWT users (non-API key) full access', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:write']);
      const context = createMockExecutionContext({ user: { tenantId: 'tenant-001' } }); // No apiKeyId

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow wildcard scope (*)', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:write', 'clients:read']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['*'] },
      });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow resource wildcard (nodes:*)', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:write']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['nodes:*'] },
      });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow action wildcard (*:read)', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:read']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['*:read'] },
      });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow direct scope match', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:read']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['nodes:read', 'clients:read'] },
      });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should deny insufficient scopes', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:write']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['nodes:read'] },
      });

      expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    });

    it('should require all scopes when multiple are required', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:read', 'clients:read']);
      const context = createMockExecutionContext({
        user: { apiKeyId: 'key-001', scopes: ['nodes:read'] }, // Missing clients:read
      });

      expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    });

    it('should deny access when user is missing', () => {
      reflector.getAllAndOverride.mockReturnValue(['nodes:read']);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    });
  });
});
