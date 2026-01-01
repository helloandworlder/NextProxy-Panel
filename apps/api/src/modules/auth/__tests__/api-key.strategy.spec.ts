import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyStrategy } from '../strategies/api-key.strategy';
import { AuthService } from '../auth.service';
import { createHash } from 'crypto';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let authService: { validateApiKey: jest.Mock };

  beforeEach(async () => {
    authService = {
      validateApiKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  const createMockRequest = (apiKey?: string) => ({
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  });

  describe('validate', () => {
    it('should throw UnauthorizedException when API key is missing', async () => {
      const req = createMockRequest();

      await expect(strategy.validate(req as any)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(req as any)).rejects.toThrow('API key is required');
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      const req = createMockRequest('pk_invalid_key_12345678');
      authService.validateApiKey.mockResolvedValue(null);

      await expect(strategy.validate(req as any)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(req as any)).rejects.toThrow('Invalid API key');
    });

    it('should return user context for valid API key', async () => {
      const apiKey = 'pk_test1234567890abcdef';
      const keyPrefix = apiKey.substring(0, 8);
      const keyHash = createHash('sha256').update(apiKey).digest('hex');

      const mockApiKeyRecord = {
        id: 'key-001',
        tenantId: 'tenant-001',
        scopes: ['nodes:read', 'clients:write'],
      };

      authService.validateApiKey.mockResolvedValue(mockApiKeyRecord);
      const req = createMockRequest(apiKey);

      const result = await strategy.validate(req as any);

      expect(result).toEqual({
        tenantId: 'tenant-001',
        apiKeyId: 'key-001',
        scopes: ['nodes:read', 'clients:write'],
      });
      expect(authService.validateApiKey).toHaveBeenCalledWith(keyPrefix, keyHash);
    });

    it('should extract correct key prefix (first 8 chars)', async () => {
      const apiKey = 'pk_abcdefghijklmnop';
      authService.validateApiKey.mockResolvedValue(null);
      const req = createMockRequest(apiKey);

      try {
        await strategy.validate(req as any);
      } catch {
        // Expected to throw
      }

      expect(authService.validateApiKey).toHaveBeenCalledWith(
        'pk_abcde',
        expect.any(String),
      );
    });

    it('should compute correct SHA256 hash', async () => {
      const apiKey = 'pk_test_key_123';
      const expectedHash = createHash('sha256').update(apiKey).digest('hex');
      authService.validateApiKey.mockResolvedValue(null);
      const req = createMockRequest(apiKey);

      try {
        await strategy.validate(req as any);
      } catch {
        // Expected to throw
      }

      expect(authService.validateApiKey).toHaveBeenCalledWith(
        expect.any(String),
        expectedHash,
      );
    });
  });
});
