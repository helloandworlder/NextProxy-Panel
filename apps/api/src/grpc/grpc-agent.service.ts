import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, PUBSUB_CHANNELS, ConfigChangeEvent, UsersChangeEvent, KickUserEvent, RateLimitEvent } from '../redis/redis.service';
import { validateXrayConfig, ValidationResult } from '../common/validators/xray-config.validator';
import { ConfigVersionService } from '../modules/config-version/config-version.service';
import { AlertService } from '../common/alert/alert.service';

// Stream connection registry
interface StreamConnection {
  nodeId: string;
  tenantId: string;
  call: grpc.ServerDuplexStream<any, any>;
  lastAlive: number;
}

@Injectable()
export class GrpcAgentService implements OnModuleInit, OnModuleDestroy {
  private server: grpc.Server;
  private connections = new Map<string, StreamConnection>();
  private proto: any;

  constructor(
    @InjectPinoLogger(GrpcAgentService.name)
    private readonly logger: PinoLogger,
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
    private configVersionService: ConfigVersionService,
    private alertService: AlertService,
  ) {}

  async onModuleInit() {
    await this.loadProto();
    await this.startServer();
    await this.subscribeToEvents();
    this.startHealthCheck();
  }

  async onModuleDestroy() {
    this.server?.forceShutdown();
  }

  private async subscribeToEvents() {
    // Subscribe to config change events
    await this.redis.subscribe(PUBSUB_CHANNELS.CONFIG_CHANGE, async (event: ConfigChangeEvent) => {
      this.logger.debug(`Config change event: ${JSON.stringify(event)}`);
      if (event.nodeId) {
        await this.pushConfig(event.nodeId);
      } else {
        await this.broadcastConfig(event.tenantId);
      }
    });

    // Subscribe to users change events
    await this.redis.subscribe(PUBSUB_CHANNELS.USERS_CHANGE, async (event: UsersChangeEvent) => {
      this.logger.debug(`Users change event: ${JSON.stringify(event)}`);
      if (event.nodeId) {
        await this.pushUsersUpdate(event.nodeId, event.added || [], event.removed || []);
      } else {
        // Broadcast to all nodes of tenant
        for (const [nodeId, conn] of this.connections) {
          if (conn.tenantId === event.tenantId) {
            await this.pushUsersUpdate(nodeId, event.added || [], event.removed || []);
          }
        }
      }
    });

    // Subscribe to kick user events
    await this.redis.subscribe(PUBSUB_CHANNELS.KICK_USER, async (event: KickUserEvent) => {
      await this.kickUsers(event.nodeId, event.emails, event.reason);
    });

    // Subscribe to rate limit events
    await this.redis.subscribe(PUBSUB_CHANNELS.RATE_LIMIT, async (event: RateLimitEvent) => {
      await this.updateRateLimit(event.nodeId, event.email, event.uploadLimit, event.downloadLimit);
    });

    this.logger.info('Subscribed to Redis Pub/Sub channels');
  }

  private async loadProto() {
    const protoPath = path.join(__dirname, 'proto', 'agent.proto');
    const packageDefinition = await protoLoader.load(protoPath, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    this.proto = grpc.loadPackageDefinition(packageDefinition).agent as any;
  }

  private async startServer() {
    this.server = new grpc.Server();
    
    this.server.addService(this.proto.AgentService.service, {
      Connect: this.handleConnect.bind(this),
    });

    const port = this.configService.get<number>('GRPC_PORT', 50051);
    
    return new Promise<void>((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) {
            this.logger.error('Failed to start gRPC server', err);
            reject(err);
            return;
          }
          this.logger.info(`gRPC server started on port ${boundPort}`);
          resolve();
        },
      );
    });
  }

  private handleConnect(call: grpc.ServerDuplexStream<any, any>) {
    let nodeId: string | null = null;
    let _tenantId: string | null = null;

    call.on('data', async (message: any) => {
      try {
        if (message.register) {
          const result = await this.handleRegister(message.register, call);
          nodeId = result.nodeId;
          _tenantId = result.tenantId;
        } else if (message.status && nodeId) {
          await this.handleStatus(nodeId, message.status);
        } else if (message.traffic && nodeId) {
          await this.handleTraffic(nodeId, message.traffic);
        } else if (message.alive && nodeId) {
          await this.handleAlive(nodeId, call);
        } else if (message.configResult && nodeId) {
          await this.handleConfigResult(nodeId, message.configResult);
        }
      } catch (error) {
        this.logger.error('Error processing message', error);
      }
    });

    call.on('end', () => {
      if (nodeId) {
        this.connections.delete(nodeId);
        this.logger.info(`Node ${nodeId} disconnected`);
      }
      call.end();
    });

    call.on('error', (err) => {
      if (nodeId) {
        this.connections.delete(nodeId);
      }
      this.logger.error('Stream error', err);
    });
  }

  private async handleRegister(
    req: any,
    call: grpc.ServerDuplexStream<any, any>,
  ): Promise<{ nodeId: string; tenantId: string }> {
    const { nodeId, token, version, coreType, coreVersion } = req;

    // Verify node token
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, tenantId: true, token: true, status: true },
    });

    if (!node || node.token !== token || node.status === 'maintenance') {
      call.write({
        registerResponse: {
          success: false,
          message: 'Invalid node credentials or node disabled',
        },
      });
      call.end();
      throw new Error('Invalid node credentials');
    }

    // Store connection
    this.connections.set(nodeId, {
      nodeId,
      tenantId: node.tenantId,
      call,
      lastAlive: Date.now(),
    });

    // Update node status
    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'online',
        lastSeenAt: new Date(),
        systemInfo: {
          version,
          coreType,
          coreVersion,
        },
      },
    });

    // Send success response
    call.write({
      registerResponse: {
        success: true,
        message: 'Registered successfully',
        trafficInterval: 5,  // 5 seconds
        statusInterval: 30,  // 30 seconds
      },
    });

    this.logger.info(`Node ${nodeId} registered via gRPC (${coreType} ${coreVersion})`);

    // Send initial config
    await this.pushConfig(nodeId);

    return { nodeId, tenantId: node.tenantId };
  }

  private async handleStatus(nodeId: string, status: any) {
    await this.redis.setNodeStatus(nodeId, {
      cpuUsage: status.cpuUsage,
      memoryUsage: status.memoryUsage,
      diskUsage: status.diskUsage,
      uptime: status.uptime,
      connections: status.connections,
      timestamp: Date.now(),
    });
  }

  private async handleTraffic(nodeId: string, traffic: any) {
    // Push to Redis buffer for BullMQ aggregation
    type TrafficItem = 
      | { email: string; upload: number; download: number; uploadRate: number; downloadRate: number }
      | { inboundTag: string; inboundUpload: number; inboundDownload: number }
      | { outboundTag: string; outboundUpload: number; outboundDownload: number };
    const trafficData: TrafficItem[] = [];

    for (const user of traffic.users || []) {
      trafficData.push({
        email: user.email,
        upload: parseInt(user.upload) || 0,
        download: parseInt(user.download) || 0,
        uploadRate: parseInt(user.uploadRate) || 0,
        downloadRate: parseInt(user.downloadRate) || 0,
      });
    }

    for (const inbound of traffic.inbounds || []) {
      trafficData.push({
        inboundTag: inbound.tag,
        inboundUpload: parseInt(inbound.upload) || 0,
        inboundDownload: parseInt(inbound.download) || 0,
      });
    }

    for (const outbound of traffic.outbounds || []) {
      trafficData.push({
        outboundTag: outbound.tag,
        outboundUpload: parseInt(outbound.upload) || 0,
        outboundDownload: parseInt(outbound.download) || 0,
      });
    }

    if (trafficData.length > 0) {
      await this.redis.pushTraffic(nodeId, trafficData);
    }
  }

  private async handleAlive(nodeId: string, call: grpc.ServerDuplexStream<any, any>) {
    const conn = this.connections.get(nodeId);
    if (conn) {
      conn.lastAlive = Date.now();
    }

    call.write({
      aliveResponse: { timestamp: Date.now().toString() },
    });
  }

  /**
   * Handle config apply result from Agent
   */
  private async handleConfigResult(nodeId: string, result: { success: boolean; errorMessage?: string; versionId?: string }) {
    const { success, errorMessage, versionId } = result;

    if (!versionId) {
      this.logger.warn(`Config result without versionId from node ${nodeId}`);
      return;
    }

    if (success) {
      await this.configVersionService.markApplied(versionId);
      this.logger.info(`Config version ${versionId} applied successfully on node ${nodeId}`);
    } else {
      const rollbackResult = await this.configVersionService.markFailed(nodeId, versionId, errorMessage || 'Unknown error');
      this.logger.error(`Config version ${versionId} failed on node ${nodeId}: ${errorMessage}`);

      // Auto-rollback to last successful version
      if (rollbackResult.rollbackTo) {
        this.logger.info(`Auto-rolling back to version ${rollbackResult.rollbackTo.id}`);
        // Push the rollback config
        const conn = this.connections.get(nodeId);
        if (conn) {
          conn.call.write({
            config: {
              configJson: JSON.stringify(rollbackResult.rollbackTo.configJson),
              etag: rollbackResult.rollbackTo.etag,
              version: rollbackResult.rollbackTo.version,
              versionId: rollbackResult.rollbackTo.id,
              isRollback: true,
            },
          });
        }

        // Trigger alert notification
        await this.alertService.sendConfigFailedAlert({
          nodeId,
          versionId,
          errorMessage,
          rollbackVersionId: rollbackResult.rollbackTo.id,
        });
      }
    }
  }

  // ========================================
  // Push methods (Panel -> Agent)
  // ========================================

  async pushConfig(nodeId: string): Promise<boolean> {
    const conn = this.connections.get(nodeId);
    if (!conn) return false;

    try {
      const node = await this.prisma.node.findUnique({
        where: { id: nodeId },
        include: {
          inbounds: { where: { enable: true } },
          outbounds: { where: { enable: true } },
          routingRules: { where: { enable: true }, orderBy: { priority: 'asc' } },
        },
      });

      if (!node) return false;

      // Generate config
      const config = {
        inbounds: node.inbounds,
        outbounds: node.outbounds,
        routing: { rules: node.routingRules },
      };

      // Validate config before pushing to Agent
      const validation: ValidationResult = validateXrayConfig(config);
      if (!validation.valid) {
        this.logger.error(`Config validation failed for node ${nodeId}`, {
          errors: validation.errors,
        });
        return false;
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`Config warnings for node ${nodeId}`, {
          warnings: validation.warnings,
        });
      }

      // Create config version
      let configVersion;
      try {
        configVersion = await this.configVersionService.createVersion(conn.tenantId, nodeId);
        await this.configVersionService.markPushing(configVersion.id);
      } catch (err) {
        this.logger.warn(`Failed to create config version for node ${nodeId}`, err);
        // Continue without version tracking
      }

      const etag = await this.redis.getConfigEtag(nodeId);

      conn.call.write({
        config: {
          configJson: JSON.stringify(config),
          etag: etag || '',
          version: configVersion?.version || Date.now(),
          versionId: configVersion?.id || '',
        },
      });

      this.logger.debug(`Pushed config to node ${nodeId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to push config to ${nodeId}`, error);
      return false;
    }
  }

  async pushUsersUpdate(nodeId: string, added: any[], removed: string[]): Promise<boolean> {
    const conn = this.connections.get(nodeId);
    if (!conn) return false;

    try {
      conn.call.write({
        users: { added, removed },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to push users to ${nodeId}`, error);
      return false;
    }
  }

  async kickUsers(nodeId: string, emails: string[], reason: string): Promise<boolean> {
    const conn = this.connections.get(nodeId);
    if (!conn) return false;

    try {
      conn.call.write({
        kick: { emails, reason },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to kick users on ${nodeId}`, error);
      return false;
    }
  }

  async updateRateLimit(nodeId: string, email: string, uploadLimit: number, downloadLimit: number): Promise<boolean> {
    const conn = this.connections.get(nodeId);
    if (!conn) return false;

    try {
      conn.call.write({
        rateLimit: { email, uploadLimit, downloadLimit },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to update rate limit on ${nodeId}`, error);
      return false;
    }
  }

  // Broadcast config to all connected nodes of a tenant
  async broadcastConfig(tenantId: string): Promise<void> {
    for (const [nodeId, conn] of this.connections) {
      if (conn.tenantId === tenantId) {
        await this.pushConfig(nodeId);
      }
    }
  }

  // Health check for stale connections
  private startHealthCheck() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 120000; // 2 minutes

      for (const [nodeId, conn] of this.connections) {
        if (now - conn.lastAlive > timeout) {
          this.logger.warn(`Node ${nodeId} timed out, closing connection`);
          conn.call.end();
          this.connections.delete(nodeId);
        }
      }
    }, 30000);
  }

  // Get connected node count
  getConnectedNodes(): string[] {
    return Array.from(this.connections.keys());
  }

  isNodeConnected(nodeId: string): boolean {
    return this.connections.has(nodeId);
  }
}
