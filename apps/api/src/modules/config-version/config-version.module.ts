import { Module } from '@nestjs/common';
import { ConfigVersionService } from './config-version.service';
import { ConfigVersionController } from './config-version.controller';

@Module({
  controllers: [ConfigVersionController],
  providers: [ConfigVersionService],
  exports: [ConfigVersionService],
})
export class ConfigVersionModule {}
