/**
 * Xray Module - Core Xray configuration building services
 */

import { Module } from '@nestjs/common';
import { XrayConfigBuilder } from './xray-config-builder';
import { XrayNodeConfigBuilder } from './xray-node-config-builder';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [XrayConfigBuilder, XrayNodeConfigBuilder],
  exports: [XrayConfigBuilder, XrayNodeConfigBuilder],
})
export class XrayModule {}

// Re-export types and services
export * from './xray-config-builder';
export * from './xray-node-config-builder';
