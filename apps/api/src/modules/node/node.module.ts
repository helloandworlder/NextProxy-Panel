import { Module } from '@nestjs/common';
import { NodeService } from './node.service';
import { NodeController } from './node.controller';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [NodeController],
  providers: [NodeService],
  exports: [NodeService],
})
export class NodeModule {}
