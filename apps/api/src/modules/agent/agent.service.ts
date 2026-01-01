/**
 * AgentService v3 - Refactored for new schema
 * - Removed ClientInboundAccess dependency (use Client.inboundTags)
 * - Removed ClientOnlineLog (use Redis only)
 * - Config fields are now JSON strings (pure passthrough)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { XrayNodeConfigBuilder } from '../../common/xray';
import { createHash } from 'crypto';

@Injectable()
export class AgentServiceV3 {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configBuilder: XrayNodeConfigBuilder,
  ) {}

  /**
   * Get complete Xray config for node (Panel generates, Agent pulls)
   * Returns full Xray JSON config ready to write to file
   */
  async getNodeConfig(nodeId: string, clientEtag?: string) {
    const cachedEtag = await this.redis.getConfigEtag(nodeId);
    if (cachedEtag && cachedEtag === clientEtag) {
      return { config: null, etag: cachedEtag, notModified: true };
    }

    // Use XrayNodeConfigBuilder to generate complete config
    const config = await this.configBuilder.buildNodeConfig(nodeId);
    
    // Inject clients into inbound settings
    await this.injectClientsToConfig(nodeId, config);

    const etag = this.computeEtag(config);
    await this.redis.setConfigEtag(nodeId, etag);

    return { config, etag, notModified: false };
  }

  /**
   * Inject valid clients into inbound.settings.clients[]
   */
  private async injectClientsToConfig(nodeId: string, config: any) {
    const now = Date.now();

    // Get all inbound tags for this node
    const inbounds = await this.prisma.inbound.findMany({
      where: { nodeId, enable: true },
      select: { tag: true, protocol: true },
    });
    const inboundTags = inbounds.map(i => i.tag);
    const protocolMap = new Map(inbounds.map(i => [i.tag, i.protocol]));

    // Get tenant for this node
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { tenantId: true },
    });
    if (!node) return;

    // Get valid clients that have access to any of these inbounds
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId: node.tenantId,
        enable: true,
        inboundTags: { hasSome: inboundTags },
      },
    });

    // Filter valid clients
    const validClients = clients.filter(client => {
      if (client.expiryTime > 0 && Number(client.expiryTime) < now) return false;
      if (client.totalBytes > 0 && client.usedBytes >= client.totalBytes) return false;
      return true;
    });

    // Group clients by inbound tag
    const clientsByTag = new Map<string, any[]>();
    for (const client of validClients) {
      for (const tag of client.inboundTags) {
        if (!inboundTags.includes(tag)) continue;
        if (!clientsByTag.has(tag)) clientsByTag.set(tag, []);
        
        const protocol = protocolMap.get(tag) as string | undefined;
        const xrayClient = this.buildXrayClient(client, protocol);
        clientsByTag.get(tag)!.push(xrayClient);
      }
    }

    // Inject clients into config.inbounds
    for (const inbound of config.inbounds) {
      if (inbound.tag === 'api') continue; // Skip API inbound
      
      const clients = clientsByTag.get(inbound.tag) || [];
      if (clients.length === 0) continue;

      const protocol = protocolMap.get(inbound.tag) as string | undefined;
      const clientsKey = ['socks', 'http'].includes(protocol || '') ? 'accounts' : 'clients';
      
      if (!inbound.settings) inbound.settings = {};
      inbound.settings[clientsKey] = clients;
    }
  }

  /**
   * Build Xray client object from database client
   */
  private buildXrayClient(client: any, protocol?: string): any {
    if (['socks', 'http'].includes(protocol || '')) {
      return {
        user: client.email,
        pass: client.password,
      };
    }

    const xrayClient: any = {
      email: client.email,
      level: client.level,
    };

    if (client.uuid) {
      xrayClient.id = client.uuid;
      if (client.flow) xrayClient.flow = client.flow;
    } else if (client.password) {
      xrayClient.password = client.password;
      if (client.method) xrayClient.method = client.method;
    }

    return xrayClient;
  }

  /**
   * Get users list for hot-reload (without full config rebuild)
   */
  async getNodeUsers(nodeId: string, clientEtag?: string) {
    const cachedEtag = await this.redis.getUsersEtag(nodeId);
    if (cachedEtag && cachedEtag === clientEtag) {
      return { users: null, rateLimits: null, etag: cachedEtag, notModified: true };
    }

    const now = Date.now();

    // Get node tenant
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { tenantId: true },
    });
    if (!node) {
      return { users: [], rateLimits: [], etag: '', notModified: false };
    }

    // Get inbound tags for this node
    const inbounds = await this.prisma.inbound.findMany({
      where: { nodeId, enable: true },
      select: { tag: true },
    });
    const inboundTags = inbounds.map(i => i.tag);

    // Get clients with access to these inbounds
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId: node.tenantId,
        enable: true,
        inboundTags: { hasSome: inboundTags },
      },
    });

    // Filter and map to user objects
    const users = clients
      .filter(client => {
        if (client.expiryTime > 0 && Number(client.expiryTime) < now) return false;
        if (client.totalBytes > 0 && client.usedBytes >= client.totalBytes) return false;
        return true;
      })
      .map(client => ({
        email: client.email,
        uuid: client.uuid,
        password: client.password,
        flow: client.flow,
        method: client.method,
        level: client.level,
        inboundTags: client.inboundTags.filter(t => inboundTags.includes(t)),
        outboundTag: client.outboundTag,
        totalBytes: Number(client.totalBytes),
        usedBytes: Number(client.usedBytes),
        expiryTime: Number(client.expiryTime),
        uploadLimit: Number(client.uploadLimit),
        downloadLimit: Number(client.downloadLimit),
        deviceLimit: client.deviceLimit,
      }));

    // Extract rate limits
    const rateLimits = users
      .filter(u => u.uploadLimit > 0 || u.downloadLimit > 0)
      .map(u => ({
        email: u.email,
        uploadBytesPerSec: u.uploadLimit,
        downloadBytesPerSec: u.downloadLimit,
      }));

    const etag = this.computeEtag({ users, rateLimits });
    await this.redis.setUsersEtag(nodeId, etag);

    return { users, rateLimits, etag, notModified: false };
  }

  /**
   * Report traffic - write to Redis cache (batch flush to DB by cron)
   */
  async reportTraffic(
    nodeId: string,
    traffics: Array<{ email: string; upload: number; download: number; inboundTag?: string }>,
  ) {
    // Get node tenant and inbound map
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { tenantId: true },
    });
    if (!node) return { success: false };

    // Get inbound map for this node (tag -> id)
    const inbounds = await this.prisma.inbound.findMany({
      where: { nodeId },
      select: { id: true, tag: true },
    });
    const inboundMap = new Map(inbounds.map(i => [i.tag, i.id]));

    // Enrich traffics with inboundId
    const enrichedTraffics = traffics.map(t => ({
      email: t.email,
      upload: t.upload,
      download: t.download,
      inboundId: t.inboundTag ? inboundMap.get(t.inboundTag) : undefined,
    }));

    // Write to Redis (atomic INCRBY)
    await this.redis.incrTraffic(nodeId, enrichedTraffics);

    // Record bandwidth sample for real-time charts
    const totalUp = traffics.reduce((sum, t) => sum + t.upload, 0);
    const totalDown = traffics.reduce((sum, t) => sum + t.download, 0);
    if (totalUp > 0 || totalDown > 0) {
      await this.redis.recordBandwidthSample('node', nodeId, totalUp, totalDown);
    }

    // Also push to buffer for batch DB write (backward compatible)
    await this.redis.pushTraffic(nodeId, traffics);

    return { success: true };
  }

  /**
   * Report status
   */
  async reportStatus(nodeId: string, status: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    onlineUsers: number;
    xrayVersion?: string;
  }) {
    await this.redis.setNodeStatus(nodeId, status);

    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'online',
        lastSeenAt: new Date(),
        runtimeStats: status,
        systemInfo: status.xrayVersion 
          ? { xrayVersion: status.xrayVersion } 
          : undefined,
      },
    });

    return { success: true };
  }

  /**
   * Report alive users - Redis only (no ClientOnlineLog table)
   * Optimized: batch query clients to avoid N+1
   */
  async reportAlive(
    nodeId: string, 
    aliveUsers: Array<{ email: string; ip: string; deviceId?: string }>
  ) {
    const now = Date.now();
    const kickUsers: string[] = [];

    // Get node tenant
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { tenantId: true },
    });
    if (!node) return { success: false, kickUsers: [] };

    // Batch query all clients by email (avoid N+1)
    const emails = aliveUsers.filter(a => a.ip).map(a => a.email);
    if (emails.length === 0) return { success: true, kickUsers: [] };

    const clients = await this.prisma.client.findMany({
      where: { tenantId: node.tenantId, email: { in: emails } },
      select: { id: true, email: true, deviceLimit: true },
    });
    const clientMap = new Map(clients.map(c => [c.email, c]));

    // Batch Redis operations using pipeline
    for (const alive of aliveUsers) {
      if (!alive.ip) continue;

      const client = clientMap.get(alive.email);
      if (!client) continue;

      // Update Redis online tracking
      await this.redis.updateOnlineUser(nodeId, alive.email, now);
      await this.redis.addDeviceOnline(client.id, alive.ip, alive.deviceId);

      // Check device limit
      if (client.deviceLimit > 0) {
        const activeDevices = await this.redis.countDevicesOnline(client.id);
        if (activeDevices > client.deviceLimit) {
          kickUsers.push(alive.email);
        }
      }
    }

    return { success: true, kickUsers };
  }

  /**
   * Report egress IPs - batch upsert for better performance
   */
  async reportEgressIps(nodeId: string, ips: Array<{
    ip: string;
    version: number;
    interfaceName?: string;
    ipType?: string;
    isp?: string;
    asn?: string;
    isActive: boolean;
  }>) {
    if (ips.length === 0) return { success: true };

    const now = new Date();
    
    // Use transaction for batch upsert
    await this.prisma.$transaction(
      ips.map(ipData => 
        this.prisma.egressIp.upsert({
          where: { nodeId_ip: { nodeId, ip: ipData.ip } },
          create: {
            nodeId,
            ip: ipData.ip,
            ipVersion: ipData.version,
            interfaceName: ipData.interfaceName,
            ipType: ipData.ipType || 'datacenter',
            isp: ipData.isp,
            asn: ipData.asn,
            isActive: ipData.isActive,
            lastCheckedAt: now,
          },
          update: {
            ipVersion: ipData.version,
            interfaceName: ipData.interfaceName,
            ipType: ipData.ipType,
            isp: ipData.isp,
            asn: ipData.asn,
            isActive: ipData.isActive,
            lastCheckedAt: now,
          },
        })
      )
    );
    return { success: true };
  }

  /**
   * Register node
   */
  async registerNode(nodeId: string, info: {
    hostname: string;
    os: string;
    arch: string;
    publicIp?: string;
    xrayVersion?: string;
    version?: string;
  }) {
    const systemInfo = {
      hostname: info.hostname,
      os: info.os,
      arch: info.arch,
      xrayVersion: info.xrayVersion,
    };

    const node = await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'online',
        publicIp: info.publicIp,
        lastSeenAt: new Date(),
        systemInfo,
      },
    });

    return {
      nodeId: node.id,
      nodeName: node.name,
      configPollInterval: 30,
      trafficReportInterval: 10,
      statusReportInterval: 10,
      alivePollInterval: 60,
    };
  }

  private computeEtag(data: any): string {
    const json = JSON.stringify(data);
    return createHash('md5').update(json).digest('hex');
  }
}
