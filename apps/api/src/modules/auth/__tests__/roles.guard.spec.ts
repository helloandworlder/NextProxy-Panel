import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { createMockExecutionContext, createMockReflector } from '../../../../test/helpers/mock-factory';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: ReturnType<typeof createMockReflector>;

  beforeEach(async () => {
    reflector = createMockReflector();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  afterEach(() => jest.clearAllMocks());

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ user: { role: 'viewer' } });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ user: { role: 'viewer' } });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow admin to access any endpoint', () => {
      reflector.getAllAndOverride.mockReturnValue(['operator']);
      const context = createMockExecutionContext({ user: { role: 'admin' } });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should allow user with matching role', () => {
      reflector.getAllAndOverride.mockReturnValue(['operator', 'viewer']);
      const context = createMockExecutionContext({ user: { role: 'operator' } });

      const result = guard.canActivate(context as any);

      expect(result).toBe(true);
    });

    it('should deny user without matching role', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const context = createMockExecutionContext({ user: { role: 'viewer' } });

      expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    });

    it('should deny access when user has no role', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);
      const context = createMockExecutionContext({ user: {} });

      expect(() => guard.canActivate(context as any)).toThrow(ForbiddenException);
    });

    it('should deny access when user is missing', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);
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
