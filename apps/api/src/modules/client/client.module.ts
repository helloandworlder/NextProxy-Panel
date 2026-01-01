import { Module } from '@nestjs/common';
import { ClientServiceV3 } from './client.service';
import { ClientController } from './client.controller';
import { XrayModule } from '../../common/xray';

@Module({
  imports: [XrayModule],
  controllers: [ClientController],
  providers: [ClientServiceV3],
  exports: [ClientServiceV3],
})
export class ClientModule {}
