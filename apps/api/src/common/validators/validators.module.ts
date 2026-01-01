/**
 * Validators Module
 * Provides configuration validation services
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboundValidator } from './inbound.validator';
import { OutboundValidator } from './outbound.validator';
import { RoutingValidator } from './routing.validator';

@Module({
  imports: [PrismaModule],
  providers: [InboundValidator, OutboundValidator, RoutingValidator],
  exports: [InboundValidator, OutboundValidator, RoutingValidator],
})
export class ValidatorsModule {}
