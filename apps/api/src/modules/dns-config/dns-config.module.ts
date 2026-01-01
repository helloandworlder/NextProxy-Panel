import { Module } from '@nestjs/common';
import { DnsConfigController } from './dns-config.controller';
import { DnsConfigService } from './dns-config.service';

@Module({
  controllers: [DnsConfigController],
  providers: [DnsConfigService],
  exports: [DnsConfigService],
})
export class DnsConfigModule {}
