import { Module } from '@nestjs/common';
import { GoSeaController } from './gosea.controller';
import { GoSeaSimpleController } from './gosea-simple.controller';
import { Socks5PoolService } from './services/socks5-pool.service';
import { RelayService } from './services/relay.service';
import { Socks5GenerateService } from './services/socks5-generate.service';
import { RelayGenerateService } from './services/relay-generate.service';
import { SinglePortMultiEgressService } from './services/single-port-multi-egress.service';
import { LocationService } from './services/location.service';
import { OrderService } from './services/order.service';
import { SmartRelayService } from './services/smart-relay.service';
import { GoSeaSubscriptionService } from './services/gosea-subscription.service';
import { BatchSocks5Service } from './services/batch-socks5.service';
import { BatchRelayService } from './services/batch-relay.service';
import { GoSeaSettingsService } from './services/gosea-settings.service';
import { InstanceService } from './services/instance.service';
import { LineService } from './services/line.service';
import { AccountService } from './services/account.service';
import { NodeGroupModule } from '../../modules/node-group/node-group.module';

@Module({
  imports: [NodeGroupModule],
  controllers: [GoSeaController, GoSeaSimpleController],
  providers: [
    Socks5PoolService, RelayService, Socks5GenerateService, RelayGenerateService,
    SinglePortMultiEgressService, LocationService, OrderService, SmartRelayService, GoSeaSubscriptionService,
    BatchSocks5Service, BatchRelayService, GoSeaSettingsService,
    InstanceService, LineService, AccountService,
  ],
  exports: [
    Socks5PoolService, RelayService, Socks5GenerateService, RelayGenerateService,
    SinglePortMultiEgressService, LocationService, OrderService, SmartRelayService, GoSeaSubscriptionService,
    BatchSocks5Service, BatchRelayService, GoSeaSettingsService,
    InstanceService, LineService, AccountService,
  ],
})
export class GoSeaModule {}
