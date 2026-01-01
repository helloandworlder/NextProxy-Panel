import { Module, Global } from '@nestjs/common';
import { GrpcAgentService } from './grpc-agent.service';
import { ConfigVersionModule } from '../modules/config-version/config-version.module';
import { AlertModule } from '../common/alert/alert.module';

@Global()
@Module({
  imports: [ConfigVersionModule, AlertModule],
  providers: [GrpcAgentService],
  exports: [GrpcAgentService],
})
export class GrpcModule {}
