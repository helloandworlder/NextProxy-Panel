import { Module } from '@nestjs/common';
import { BalancerController } from './balancer.controller';
import { BalancerService } from './balancer.service';

@Module({
  controllers: [BalancerController],
  providers: [BalancerService],
  exports: [BalancerService],
})
export class BalancerModule {}
