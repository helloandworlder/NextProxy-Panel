import { Controller, Get, Param, Query, Res, Header, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { SubscriptionService, SubscriptionFormat } from './subscription.service';
import { Public } from '../auth/decorators';

@ApiTags('Subscription')
@Controller('sub')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Get(':subId')
  @Public()
  @ApiOperation({ summary: 'Get subscription by subId with optional signature verification' })
  @ApiParam({ name: 'subId', description: 'Subscription ID' })
  @ApiQuery({ name: 'format', enum: ['clash', 'v2ray', 'singbox', 'shadowrocket', 'surge'], required: false })
  @ApiQuery({ name: 'ts', description: 'Timestamp for signed URLs', required: false })
  @ApiQuery({ name: 'sig', description: 'HMAC signature for verification', required: false })
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getSubscription(
    @Param('subId') subId: string,
    @Query('format') format: SubscriptionFormat = 'clash',
    @Res() res: Response,
    @Query('ts') timestamp?: string,
    @Query('sig') signature?: string,
  ) {
    // If signature verification is enabled, validate the request
    const requireSignature = this.configService.get<boolean>('SUBSCRIPTION_REQUIRE_SIGNATURE', false);
    if (requireSignature) {
      this.verifySignature(subId, timestamp, signature);
    }

    const content = await this.subscriptionService.getSubscription(subId, format);
    
    // Set appropriate headers based on format
    const filename = `subscription.${format === 'clash' ? 'yaml' : format === 'singbox' ? 'json' : 'txt'}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Subscription-Userinfo', 'upload=0; download=0; total=0; expire=0');
    
    return res.send(content);
  }

  @Get(':subId/info')
  @Public()
  @ApiOperation({ summary: 'Get subscription info' })
  async getSubscriptionInfo(@Param('subId') subId: string) {
    return { subId, formats: ['clash', 'v2ray', 'singbox', 'shadowrocket', 'surge'] };
  }

  /**
   * Verify HMAC signature for subscription URL
   * URL format: /sub/{subId}?ts={timestamp}&sig={hmac}
   */
  private verifySignature(subId: string, timestamp?: string, signature?: string): void {
    if (!timestamp || !signature) {
      throw new BadRequestException('Missing signature parameters (ts, sig)');
    }

    // Check timestamp validity (within 24 hours)
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 86400; // 24 hours
    if (isNaN(ts) || Math.abs(now - ts) > maxAge) {
      throw new BadRequestException('Signature expired or invalid timestamp');
    }

    // Verify HMAC signature
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    const expectedSig = createHmac('sha256', secret)
      .update(`${subId}:${timestamp}`)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter URLs

    if (signature !== expectedSig) {
      throw new BadRequestException('Invalid signature');
    }
  }
}
