import { Module } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { ValidatorsModule } from '../../common/validators/validators.module';

@Module({
  imports: [ValidatorsModule],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
