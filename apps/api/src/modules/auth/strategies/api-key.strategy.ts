import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { createHash } from 'crypto';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Extract prefix (first 8 chars) and compute hash
    const keyPrefix = apiKey.substring(0, 8);
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const validKey = await this.authService.validateApiKey(keyPrefix, keyHash);
    if (!validKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      tenantId: validKey.tenantId,
      apiKeyId: validKey.id,
      scopes: validKey.scopes,
    };
  }
}
