/**
 * ClientService v3 - Simplified client management with 3x-ui style features
 * Clients are synced to Inbound.settings.clients[] automatically
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { XrayConfigBuilder, XrayClientConfig } from '../../common/xray';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

// ============================================
// DTOs (string-based for API compatibility)
// ============================================

export interface CreateClientDto {
  email: string;
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
  level?: number;
  totalBytes?: string;
  expiryTime?: string;
  uploadLimit?: string;
  downloadLimit?: string;
  deviceLimit?: number;
  // 3x-ui style fields
  limitIp?: number;
  reset?: number;
  delayedStart?: boolean;
  tgId?: string;
  comment?: string;
  outboundTag?: string;
  inboundTags?: string[];
  subId?: string;
  remark?: string;
  enable?: boolean;
}

export interface UpdateClientDto {
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
  level?: number;
  totalBytes?: string;
  expiryTime?: string;
  uploadLimit?: string;
  downloadLimit?: string;
  deviceLimit?: number;
  // 3x-ui style fields
  limitIp?: number;
  reset?: number;
  delayedStart?: boolean;
  tgId?: string;
  comment?: string;
  outboundTag?: string;
  inboundTags?: string[];
  subId?: string;
  remark?: string;
  enable?: boolean;
}

export interface BulkCreateClientsDto {
  emailMethod: number; // 0=random, 1=random+prefix, 2=random+prefix+num, 3=random+prefix+num+postfix, 4=prefix+num+postfix
  firstNum?: number;
  lastNum?: number;
  emailPrefix?: string;
  emailPostfix?: string;
  quantity?: number;
  totalBytes?: string;
  expiryTime?: string;
  limitIp?: number;
  reset?: number;
  delayedStart?: boolean;
  tgId?: string;
  inboundTags?: string[];
  outboundTag?: string;
}

// ============================================
// Service
// ============================================

@Injectable()
export class ClientServiceV3 {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configBuilder: XrayConfigBuilder,
  ) {}

  /**
   * Generate random string for email
   */
  private generateRandomString(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Create client and sync to inbounds
   */
  async create(tenantId: string, dto: CreateClientDto) {
    // Validate email uniqueness
    const existing = await this.prisma.client.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(`Client with email ${dto.email} already exists`);
    }

    // Generate UUID if not provided
    const uuid = dto.uuid || uuidv4();

    const client = await this.prisma.client.create({
      data: {
        tenantId,
        email: dto.email,
        uuid,
        password: dto.password,
        flow: dto.flow,
        method: dto.method,
        level: dto.level || 0,
        totalBytes: dto.totalBytes ? BigInt(dto.totalBytes) : BigInt(0),
        expiryTime: dto.expiryTime ? BigInt(dto.expiryTime) : BigInt(0),
        uploadLimit: dto.uploadLimit ? BigInt(dto.uploadLimit) : BigInt(0),
        downloadLimit: dto.downloadLimit ? BigInt(dto.downloadLimit) : BigInt(0),
        deviceLimit: dto.deviceLimit || 0,
        // 3x-ui style fields
        limitIp: dto.limitIp || 0,
        reset: dto.reset || 0,
        delayedStart: dto.delayedStart || false,
        tgId: dto.tgId,
        comment: dto.comment,
        outboundTag: dto.outboundTag,
        inboundTags: dto.inboundTags || [],
        subId: dto.subId,
        remark: dto.remark,
        enable: dto.enable ?? true,
      },
    });

    // Sync to inbounds
    if (dto.inboundTags && dto.inboundTags.length > 0) {
      await this.syncClientToInbounds(tenantId, client);
    }

    return client;
  }

  /**
   * Bulk create clients (3x-ui style) - optimized with transaction
   */
  async bulkCreate(tenantId: string, dto: BulkCreateClientsDto) {
    const method = dto.emailMethod;
    const prefix = dto.emailPrefix || '';
    const postfix = dto.emailPostfix || '';

    let start: number, end: number;
    if (method > 1) {
      start = dto.firstNum || 1;
      end = (dto.lastNum || 1) + 1;
    } else {
      start = 0;
      end = dto.quantity || 1;
    }

    // Generate all client data first
    const clientsData: Array<{
      tenantId: string;
      email: string;
      uuid: string;
      totalBytes: bigint;
      expiryTime: bigint;
      limitIp: number;
      reset: number;
      delayedStart: boolean;
      tgId?: string;
      inboundTags: string[];
      outboundTag?: string;
      enable: boolean;
    }> = [];

    for (let i = start; i < end; i++) {
      let email = '';
      
      switch (method) {
        case 0: email = this.generateRandomString(8); break;
        case 1: email = prefix + this.generateRandomString(8); break;
        case 2: email = this.generateRandomString(4) + prefix + i; break;
        case 3: email = this.generateRandomString(4) + prefix + i + postfix; break;
        case 4: email = prefix + i + postfix; break;
      }

      clientsData.push({
        tenantId,
        email,
        uuid: uuidv4(),
        totalBytes: dto.totalBytes ? BigInt(dto.totalBytes) : BigInt(0),
        expiryTime: dto.expiryTime ? BigInt(dto.expiryTime) : BigInt(0),
        limitIp: dto.limitIp || 0,
        reset: dto.reset || 0,
        delayedStart: dto.delayedStart || false,
        tgId: dto.tgId,
        inboundTags: dto.inboundTags || [],
        outboundTag: dto.outboundTag,
        enable: true,
      });
    }

    // Batch create using createMany (skipDuplicates)
    const result = await this.prisma.client.createMany({
      data: clientsData,
      skipDuplicates: true,
    });

    // Fetch created clients for sync
    const clients = await this.prisma.client.findMany({
      where: { tenantId, email: { in: clientsData.map(c => c.email) } },
    });

    // Batch sync to inbounds if needed
    if (dto.inboundTags && dto.inboundTags.length > 0 && clients.length > 0) {
      await this.batchSyncClientsToInbounds(tenantId, clients);
    }

    return { created: result.count, clients };
  }

  async findAll(tenantId: string, options?: { subId?: string; enable?: boolean; page?: number; limit?: number }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 100, 500); // Max 500 per page
    const skip = (page - 1) * limit;

    return this.prisma.client.findMany({
      where: {
        tenantId,
        ...(options?.subId && { subId: options.subId }),
        ...(options?.enable !== undefined && { enable: options.enable }),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async findByEmail(tenantId: string, email: string) {
    const client = await this.prisma.client.findFirst({
      where: { tenantId, email },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    const existing = await this.findOne(tenantId, id);
    const oldInboundTags = existing.inboundTags;

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        uuid: dto.uuid,
        password: dto.password,
        flow: dto.flow,
        method: dto.method,
        level: dto.level,
        totalBytes: dto.totalBytes !== undefined ? BigInt(dto.totalBytes) : undefined,
        expiryTime: dto.expiryTime !== undefined ? BigInt(dto.expiryTime) : undefined,
        uploadLimit: dto.uploadLimit !== undefined ? BigInt(dto.uploadLimit) : undefined,
        downloadLimit: dto.downloadLimit !== undefined ? BigInt(dto.downloadLimit) : undefined,
        deviceLimit: dto.deviceLimit,
        // 3x-ui style fields
        limitIp: dto.limitIp,
        reset: dto.reset,
        delayedStart: dto.delayedStart,
        tgId: dto.tgId,
        comment: dto.comment,
        outboundTag: dto.outboundTag,
        inboundTags: dto.inboundTags,
        subId: dto.subId,
        remark: dto.remark,
        enable: dto.enable,
      },
    });

    // Sync to inbounds if tags changed
    const newInboundTags = dto.inboundTags || existing.inboundTags;
    const tagsChanged = JSON.stringify(oldInboundTags) !== JSON.stringify(newInboundTags);
    
    if (tagsChanged || dto.uuid || dto.password || dto.flow || dto.enable !== undefined) {
      await this.syncClientToInbounds(tenantId, client);
      // Also remove from old inbounds
      const removedTags = oldInboundTags.filter(t => !newInboundTags.includes(t));
      if (removedTags.length > 0) {
        await this.removeClientFromInbounds(tenantId, existing.email, removedTags);
      }
    }

    return client;
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);
    
    // Remove from all inbounds first
    if (existing.inboundTags.length > 0) {
      await this.removeClientFromInbounds(tenantId, existing.email, existing.inboundTags);
    }

    return this.prisma.client.delete({ where: { id } });
  }

  /**
   * Sync client to all assigned inbounds - optimized with transaction
   */
  private async syncClientToInbounds(tenantId: string, client: any) {
    if (!client.inboundTags || client.inboundTags.length === 0) return;

    const inbounds = await this.prisma.inbound.findMany({
      where: { tenantId, tag: { in: client.inboundTags } },
    });

    if (inbounds.length === 0) return;

    const xrayClient = this.configBuilder.buildClient({
      email: client.email,
      level: client.level,
      uuid: client.uuid,
      password: client.password,
      flow: client.flow,
      method: client.method,
    });

    // Prepare all updates
    const updates = inbounds.map(inbound => {
      const settings = JSON.parse(inbound.settings || '{}');
      this.upsertClientInSettings(settings, xrayClient, inbound.protocol);
      return {
        id: inbound.id,
        nodeId: inbound.nodeId,
        settings: JSON.stringify(settings),
      };
    });

    // Batch update using transaction
    await this.prisma.$transaction(
      updates.map(u => this.prisma.inbound.update({
        where: { id: u.id },
        data: { settings: u.settings },
      }))
    );

    // Invalidate cache for affected nodes (batch)
    const affectedNodeIds = [...new Set(updates.map(u => u.nodeId))];
    await Promise.all(affectedNodeIds.map(nodeId => this.redis.invalidateNodeCache(nodeId)));
  }

  /**
   * Batch sync multiple clients to inbounds - for bulk operations
   */
  private async batchSyncClientsToInbounds(tenantId: string, clients: any[]) {
    if (clients.length === 0) return;

    // Get all unique inbound tags
    const allTags = [...new Set(clients.flatMap(c => c.inboundTags || []))];
    if (allTags.length === 0) return;

    const inbounds = await this.prisma.inbound.findMany({
      where: { tenantId, tag: { in: allTags } },
    });

    if (inbounds.length === 0) return;

    // Build client map by tag
    const clientsByTag = new Map<string, any[]>();
    for (const client of clients) {
      for (const tag of client.inboundTags || []) {
        if (!clientsByTag.has(tag)) clientsByTag.set(tag, []);
        clientsByTag.get(tag)!.push(client);
      }
    }

    // Prepare all updates
    const updates: Array<{ id: string; nodeId: string; settings: string }> = [];
    
    for (const inbound of inbounds) {
      const tagClients = clientsByTag.get(inbound.tag) || [];
      if (tagClients.length === 0) continue;

      const settings = JSON.parse(inbound.settings || '{}');
      
      for (const client of tagClients) {
        const xrayClient = this.configBuilder.buildClient({
          email: client.email,
          level: client.level,
          uuid: client.uuid,
          password: client.password,
          flow: client.flow,
          method: client.method,
        });
        this.upsertClientInSettings(settings, xrayClient, inbound.protocol);
      }

      updates.push({
        id: inbound.id,
        nodeId: inbound.nodeId,
        settings: JSON.stringify(settings),
      });
    }

    // Batch update using transaction
    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map(u => this.prisma.inbound.update({
          where: { id: u.id },
          data: { settings: u.settings },
        }))
      );

      // Invalidate cache for affected nodes
      const affectedNodeIds = [...new Set(updates.map(u => u.nodeId))];
      await Promise.all(affectedNodeIds.map(nodeId => this.redis.invalidateNodeCache(nodeId)));
    }
  }

  /**
   * Remove client from specified inbounds - optimized with transaction
   */
  private async removeClientFromInbounds(tenantId: string, email: string, tags: string[]) {
    const inbounds = await this.prisma.inbound.findMany({
      where: { tenantId, tag: { in: tags } },
    });

    if (inbounds.length === 0) return;

    // Prepare all updates
    const updates = inbounds.map(inbound => {
      const settings = JSON.parse(inbound.settings || '{}');
      this.removeClientFromSettings(settings, email, inbound.protocol);
      return {
        id: inbound.id,
        nodeId: inbound.nodeId,
        settings: JSON.stringify(settings),
      };
    });

    // Batch update using transaction
    await this.prisma.$transaction(
      updates.map(u => this.prisma.inbound.update({
        where: { id: u.id },
        data: { settings: u.settings },
      }))
    );

    // Invalidate cache for affected nodes (batch)
    const affectedNodeIds = [...new Set(updates.map(u => u.nodeId))];
    await Promise.all(affectedNodeIds.map(nodeId => this.redis.invalidateNodeCache(nodeId)));
  }

  private upsertClientInSettings(settings: any, client: XrayClientConfig, protocol: string) {
    const clientsKey = ['socks', 'http'].includes(protocol) ? 'accounts' : 'clients';
    if (!settings[clientsKey]) settings[clientsKey] = [];

    const idx = settings[clientsKey].findIndex((c: any) => 
      c.email === client.email || c.user === client.email
    );

    const clientData = ['socks', 'http'].includes(protocol)
      ? { user: client.email, pass: client.password }
      : client;

    if (idx >= 0) {
      settings[clientsKey][idx] = clientData;
    } else {
      settings[clientsKey].push(clientData);
    }
  }

  private removeClientFromSettings(settings: any, email: string, protocol: string) {
    const clientsKey = ['socks', 'http'].includes(protocol) ? 'accounts' : 'clients';
    if (!settings[clientsKey]) return;

    settings[clientsKey] = settings[clientsKey].filter((c: any) => 
      c.email !== email && c.user !== email
    );
  }

  /**
   * Reset client traffic
   */
  async resetTraffic(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.client.update({
      where: { id },
      data: { usedBytes: BigInt(0) },
    });
  }

  /**
   * Get client stats
   */
  async getStats(tenantId: string, clientId: string) {
    return this.prisma.clientStats.findMany({
      where: { clientId },
      include: { node: true, inbound: true },
    });
  }

  // ============================================
  // IP Tracking (3x-ui style)
  // ============================================

  /**
   * Get client IP logs
   */
  async getClientIps(tenantId: string, clientId: string) {
    await this.findOne(tenantId, clientId);
    return this.prisma.clientIpLog.findMany({
      where: { clientId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Log client IP connection
   */
  async logClientIp(tenantId: string, clientId: string, ip: string, inboundTag?: string) {
    const client = await this.findOne(tenantId, clientId);
    
    // Check IP limit
    if (client.limitIp > 0) {
      const activeIps = await this.prisma.clientIpLog.count({
        where: { 
          clientId,
          lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Active in last 5 minutes
        },
      });
      
      // Check if this is a new IP
      const existingIp = await this.prisma.clientIpLog.findFirst({
        where: { clientId, ip },
      });
      
      if (!existingIp && activeIps >= client.limitIp) {
        throw new BadRequestException(`IP limit exceeded (${client.limitIp})`);
      }
    }

    // Handle delayed start - set expiry on first connection
    if (client.delayedStart && !client.firstConnectAt) {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { firstConnectAt: new Date() },
      });
    }

    // Upsert IP log
    return this.prisma.clientIpLog.upsert({
      where: {
        clientId_ip: { clientId, ip },
      },
      create: {
        clientId,
        ip,
        inboundTag,
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
        inboundTag,
      },
    });
  }

  /**
   * Clear client IP logs
   */
  async clearClientIps(tenantId: string, clientId: string) {
    await this.findOne(tenantId, clientId);
    return this.prisma.clientIpLog.deleteMany({
      where: { clientId },
    });
  }

  /**
   * Get online clients count
   */
  async getOnlineClients(tenantId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const clients = await this.prisma.client.findMany({
      where: { tenantId },
      include: {
        clientIpLogs: {
          where: { lastSeenAt: { gte: fiveMinutesAgo } },
        },
      },
    });

    return clients.filter(c => c.clientIpLogs.length > 0).map(c => ({
      id: c.id,
      email: c.email,
      activeIps: c.clientIpLogs.length,
      ips: c.clientIpLogs.map(log => ({
        ip: log.ip,
        inboundTag: log.inboundTag,
        lastSeenAt: log.lastSeenAt,
      })),
    }));
  }
}
