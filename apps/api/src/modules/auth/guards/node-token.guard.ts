import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class NodeTokenGuard extends AuthGuard('node-token') {}
