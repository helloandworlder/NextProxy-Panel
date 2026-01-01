import { Module } from '@nestjs/common';
import { DnsService } from './dns.service';
import { DnsController } from './dns.controller';

@Module({
  controllers: [DnsController],
  providers: [DnsService],
  exports: [DnsService],
})
export class DnsModule {}
