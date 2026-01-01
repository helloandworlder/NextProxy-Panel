import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface ConfigFailedAlert {
  nodeId: string;
  versionId: string;
  errorMessage?: string;
  rollbackVersionId?: string;
}

export interface NodeOfflineAlert {
  nodeId: string;
  nodeName: string;
  lastSeenAt: Date;
}

export interface AlertPayload {
  type: 'config_failed' | 'node_offline' | 'high_traffic' | 'quota_exceeded';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class AlertService {
  private webhookUrl?: string;

  constructor(
    @InjectPinoLogger(AlertService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
  }

  /**
   * Send alert for config deployment failure
   */
  async sendConfigFailedAlert(data: ConfigFailedAlert): Promise<void> {
    const node = await this.prisma.node.findUnique({
      where: { id: data.nodeId },
      select: { name: true, tenantId: true },
    });

    const alert: AlertPayload = {
      type: 'config_failed',
      severity: 'error',
      title: `Config Deployment Failed: ${node?.name || data.nodeId}`,
      message: data.errorMessage || 'Unknown error during config deployment',
      metadata: {
        nodeId: data.nodeId,
        nodeName: node?.name,
        versionId: data.versionId,
        rollbackVersionId: data.rollbackVersionId,
        tenantId: node?.tenantId,
      },
      timestamp: new Date(),
    };

    await this.dispatchAlert(alert);
  }

  /**
   * Send alert for node going offline
   */
  async sendNodeOfflineAlert(data: NodeOfflineAlert): Promise<void> {
    const alert: AlertPayload = {
      type: 'node_offline',
      severity: 'warning',
      title: `Node Offline: ${data.nodeName}`,
      message: `Node ${data.nodeName} has been offline since ${data.lastSeenAt.toISOString()}`,
      metadata: {
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        lastSeenAt: data.lastSeenAt.toISOString(),
      },
      timestamp: new Date(),
    };

    await this.dispatchAlert(alert);
  }

  /**
   * Dispatch alert to configured channels
   */
  private async dispatchAlert(alert: AlertPayload): Promise<void> {
    this.logger.info({ alert }, `Alert: ${alert.title}`);

    // Send to webhook if configured
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
        this.logger.debug(`Alert sent to webhook: ${alert.type}`);
      } catch (err) {
        this.logger.error({ err }, 'Failed to send alert to webhook');
      }
    }

    // Store alert in database for audit
    try {
      await this.prisma.$executeRaw`
        INSERT INTO system_settings (id, key, value, created_at, updated_at)
        VALUES (gen_random_uuid(), ${'alert:' + Date.now()}, ${JSON.stringify(alert)}::jsonb, NOW(), NOW())
        ON CONFLICT (key) DO NOTHING
      `;
    } catch (err) {
      this.logger.warn({ err }, 'Failed to store alert in database');
    }
  }
}
