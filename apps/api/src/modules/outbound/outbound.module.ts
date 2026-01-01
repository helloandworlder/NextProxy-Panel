import { Module } from '@nestjs/common';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';
import { ValidatorsModule } from '../../common/validators/validators.module';

@Module({
  imports: [ValidatorsModule],
  controllers: [OutboundController],
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
