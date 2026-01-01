import { Module } from '@nestjs/common';
import { InboundServiceV3 } from './inbound.service';
import { InboundController } from './inbound.controller';
import { XrayModule } from '../../common/xray';

@Module({
  imports: [XrayModule],
  controllers: [InboundController],
  providers: [InboundServiceV3],
  exports: [InboundServiceV3],
})
export class InboundModule {}
