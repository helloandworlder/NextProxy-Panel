import { Module } from '@nestjs/common';
import { PolicyConfigController } from './policy-config.controller';
import { PolicyConfigService } from './policy-config.service';

@Module({
  controllers: [PolicyConfigController],
  providers: [PolicyConfigService],
  exports: [PolicyConfigService],
})
export class PolicyConfigModule {}
