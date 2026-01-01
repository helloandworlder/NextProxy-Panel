import { Module } from '@nestjs/common';
import { EgressIpController } from './egress-ip.controller';
import { EgressIpService } from './egress-ip.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EgressIpController],
  providers: [EgressIpService],
  exports: [EgressIpService],
})
export class EgressIpModule {}
