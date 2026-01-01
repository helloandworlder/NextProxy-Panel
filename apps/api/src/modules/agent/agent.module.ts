import { Module } from '@nestjs/common';
import { AgentServiceV3 } from './agent.service';
import { AgentControllerV3 } from './agent.controller';
import { AuthModule } from '../auth/auth.module';
import { XrayModule } from '../../common/xray';

@Module({
  imports: [AuthModule, XrayModule],
  controllers: [AgentControllerV3],
  providers: [AgentServiceV3],
  exports: [AgentServiceV3],
})
export class AgentModule {}
