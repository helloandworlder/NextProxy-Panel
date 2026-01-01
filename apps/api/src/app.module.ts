import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueuesModule } from './queues/queues.module';
import { GrpcModule } from './grpc/grpc.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { NodeModule } from './modules/node/node.module';
import { NodeGroupModule } from './modules/node-group/node-group.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { RoutingModule } from './modules/routing/routing.module';
import { BalancerModule } from './modules/balancer/balancer.module';
import { DnsConfigModule } from './modules/dns-config/dns-config.module';
import { PolicyConfigModule } from './modules/policy-config/policy-config.module';
import { ClientModule } from './modules/client/client.module';
import { AgentModule } from './modules/agent/agent.module';
import { StatsModule } from './modules/stats/stats.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { EgressIpModule } from './modules/egress-ip/egress-ip.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { DnsModule } from './modules/dns/dns.module';
import { PluginModule } from './plugins/plugin.module';
import { ConfigVersionModule } from './modules/config-version/config-version.module';
import { InstallModule } from './modules/install/install.module';
import { AuditLogInterceptor } from './common/interceptors';
import { validateConfig } from './common/config/config.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
    }),
    // Pino structured logging
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get('LOG_LEVEL', 'info'),
          transport: configService.get('NODE_ENV') !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
          redact: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers["x-node-token"]'],
        },
      }),
    }),
    // Rate limiting: 100 requests per minute for general API, 1000 for Agent API
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 10,   // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000,  // 1000 requests per hour
      },
    ]),
    PrismaModule,
    RedisModule,
    QueuesModule,
    GrpcModule,
    AuthModule,
    TenantModule,
    NodeModule,
    NodeGroupModule,
    InboundModule,
    OutboundModule,
    RoutingModule,
    BalancerModule,
    DnsConfigModule,
    PolicyConfigModule,
    ClientModule,
    AgentModule,
    StatsModule,
    SubscriptionModule,
    AuditLogModule,
    HealthModule,
    EgressIpModule,
    SystemAdminModule,
    DnsModule,
    PluginModule,
    ConfigVersionModule,
    InstallModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
