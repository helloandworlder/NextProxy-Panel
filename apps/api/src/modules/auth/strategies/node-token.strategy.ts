import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class NodeTokenStrategy extends PassportStrategy(Strategy, 'node-token') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const token = req.headers['x-node-token'] as string;
    if (!token) {
      throw new UnauthorizedException('Node token is required');
    }

    const node = await this.authService.validateNodeToken(token);
    if (!node) {
      throw new UnauthorizedException('Invalid node token');
    }

    return {
      nodeId: node.id,
      tenantId: node.tenantId,
      nodeName: node.name,
    };
  }
}
