import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from './redis.constants';

// Pub/Sub channels
export const PUBSUB_CHANNELS = {
  CONFIG_CHANGE: 'config:change',
  USERS_CHANGE: 'users:change',
  KICK_USER: 'kick:user',
  RATE_LIMIT: 'rate:limit',
} as const;

export interface ConfigChangeEvent {
  tenantId: string;
  nodeId?: string; // If null, broadcast to all nodes of tenant
}

export interface UsersChangeEvent {
  tenantId: string;
  nodeId?: string;
  added?: string[]; // emails
  removed?: string[]; // emails
}

export interface KickUserEvent {
  nodeId: string;
  emails: string[];
  reason: string;
}

export interface RateLimitEvent {
  nodeId: string;
  email: string;
  uploadLimit: number;
  downloadLimit: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;
  private readonly publisher: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }

  /**
   * Ping Redis to check connection health
   */
  async ping(): Promise<string> {
    return this.client.ping();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // ============================================
  // Pub/Sub Operations
  // ============================================

  async publish(channel: string, message: object): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(JSON.parse(msg));
      }
    });
  }

  // Convenience methods for config changes
  async publishConfigChange(event: ConfigChangeEvent): Promise<void> {
    await this.publish(PUBSUB_CHANNELS.CONFIG_CHANGE, event);
  }

  async publishUsersChange(event: UsersChangeEvent): Promise<void> {
    await this.publish(PUBSUB_CHANNELS.USERS_CHANGE, event);
  }

  async publishKickUser(event: KickUserEvent): Promise<void> {
    await this.publish(PUBSUB_CHANNELS.KICK_USER, event);
  }

  async publishRateLimit(event: RateLimitEvent): Promise<void> {
    await this.publish(PUBSUB_CHANNELS.RATE_LIMIT, event);
  }

  // ============================================
  // Basic Operations
  // ============================================

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * @deprecated Use scanKeys() instead for production - KEYS blocks Redis
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Production-safe key scanning using SCAN (non-blocking)
   */
  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
      cursor = nextCursor;
      results.push(...keys);
    } while (cursor !== '0');
    return results;
  }

  // ============================================
  // ETag Caching
  // ============================================

  async getConfigEtag(nodeId: string): Promise<string | null> {
    return this.client.get(`${REDIS_KEYS.CONFIG_ETAG}${nodeId}`);
  }

  async setConfigEtag(nodeId: string, etag: string): Promise<void> {
    await this.client.setex(`${REDIS_KEYS.CONFIG_ETAG}${nodeId}`, REDIS_TTL.CONFIG_ETAG, etag);
  }

  async getUsersEtag(nodeId: string): Promise<string | null> {
    return this.client.get(`${REDIS_KEYS.USERS_ETAG}${nodeId}`);
  }

  async setUsersEtag(nodeId: string, etag: string): Promise<void> {
    await this.client.setex(`${REDIS_KEYS.USERS_ETAG}${nodeId}`, REDIS_TTL.USERS_ETAG, etag);
  }

  async invalidateNodeCache(nodeId: string): Promise<void> {
    await this.client.del(`${REDIS_KEYS.CONFIG_ETAG}${nodeId}`);
    await this.client.del(`${REDIS_KEYS.USERS_ETAG}${nodeId}`);
  }

  // ============================================
  // Node Status (Real-time)
  // ============================================

  async setNodeStatus(nodeId: string, status: object): Promise<void> {
    await this.client.setex(
      `${REDIS_KEYS.NODE_STATUS}${nodeId}`,
      REDIS_TTL.NODE_STATUS,
      JSON.stringify(status),
    );
  }

  async getNodeStatus(nodeId: string): Promise<object | null> {
    const data = await this.client.get(`${REDIS_KEYS.NODE_STATUS}${nodeId}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllNodeStatuses(): Promise<Map<string, object>> {
    const keys = await this.scanKeys(`${REDIS_KEYS.NODE_STATUS}*`);
    const result = new Map<string, object>();
    if (keys.length === 0) return result;
    
    // Use pipeline for batch get
    const pipeline = this.client.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }
    const values = await pipeline.exec();
    
    keys.forEach((key, i) => {
      const nodeId = key.replace(REDIS_KEYS.NODE_STATUS, '');
      const data = values?.[i]?.[1] as string | null;
      if (data) result.set(nodeId, JSON.parse(data));
    });
    return result;
  }

  // ============================================
  // Node Traffic (Real-time)
  // ============================================

  async setNodeTraffic(nodeId: string, traffic: object): Promise<void> {
    await this.client.setex(
      `${REDIS_KEYS.NODE_TRAFFIC}${nodeId}`,
      REDIS_TTL.NODE_TRAFFIC,
      JSON.stringify(traffic),
    );
  }

  async getNodeTraffic(nodeId: string): Promise<object | null> {
    const data = await this.client.get(`${REDIS_KEYS.NODE_TRAFFIC}${nodeId}`);
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // Traffic Buffering
  // ============================================

  async pushTraffic(nodeId: string, traffics: object[]): Promise<void> {
    const key = `${REDIS_KEYS.TRAFFIC_BUFFER}${nodeId}`;
    await this.client.rpush(key, JSON.stringify(traffics));
  }

  async popAllTraffic(nodeId: string): Promise<object[][]> {
    const key = `${REDIS_KEYS.TRAFFIC_BUFFER}${nodeId}`;
    const items = await this.client.lrange(key, 0, -1);
    if (items.length > 0) {
      await this.client.del(key);
    }
    return items.map((item) => JSON.parse(item));
  }

  async getAllTrafficBufferKeys(): Promise<string[]> {
    return this.scanKeys(`${REDIS_KEYS.TRAFFIC_BUFFER}*`);
  }

  // ============================================
  // Online Users Tracking (ZSET)
  // ============================================

  async updateOnlineUser(nodeId: string, email: string, timestamp: number): Promise<void> {
    await this.client.zadd(`${REDIS_KEYS.ONLINE_USERS}${nodeId}`, timestamp, email);
  }

  async getOnlineUsers(nodeId: string, sinceTimestamp: number): Promise<string[]> {
    return this.client.zrangebyscore(`${REDIS_KEYS.ONLINE_USERS}${nodeId}`, sinceTimestamp, '+inf');
  }

  async removeOfflineUsers(nodeId: string, beforeTimestamp: number): Promise<number> {
    return this.client.zremrangebyscore(`${REDIS_KEYS.ONLINE_USERS}${nodeId}`, '-inf', beforeTimestamp);
  }

  async countOnlineUsers(nodeId: string, sinceTimestamp: number): Promise<number> {
    return this.client.zcount(`${REDIS_KEYS.ONLINE_USERS}${nodeId}`, sinceTimestamp, '+inf');
  }

  // ============================================
  // Device Tracking (SET)
  // ============================================

  async addDeviceOnline(clientId: string, ip: string, deviceId?: string): Promise<void> {
    const member = deviceId ? `${ip}:${deviceId}` : ip;
    await this.client.sadd(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`, member);
    await this.client.expire(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`, REDIS_TTL.ONLINE_TIMEOUT);
  }

  async getDevicesOnline(clientId: string): Promise<string[]> {
    return this.client.smembers(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`);
  }

  async countDevicesOnline(clientId: string): Promise<number> {
    return this.client.scard(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`);
  }

  async removeDeviceOnline(clientId: string, ip: string, deviceId?: string): Promise<void> {
    const member = deviceId ? `${ip}:${deviceId}` : ip;
    await this.client.srem(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`, member);
  }

  async clearDevicesOnline(clientId: string): Promise<void> {
    await this.client.del(`${REDIS_KEYS.DEVICE_ONLINE}${clientId}`);
  }

  // ============================================
  // Traffic Counters (Atomic INCRBY)
  // ============================================

  async incrTraffic(
    nodeId: string,
    traffics: Array<{ email: string; upload: number; download: number; inboundId?: string }>,
  ): Promise<void> {
    const pipeline = this.client.pipeline();
    let nodeUp = 0;
    let nodeDown = 0;

    for (const t of traffics) {
      // Client-level counters
      if (t.upload > 0) {
        pipeline.incrby(`${REDIS_KEYS.TRAFFIC_CLIENT_UP}${t.email}`, t.upload);
      }
      if (t.download > 0) {
        pipeline.incrby(`${REDIS_KEYS.TRAFFIC_CLIENT_DOWN}${t.email}`, t.download);
      }
      // Inbound-level counters
      if (t.inboundId) {
        if (t.upload > 0) {
          pipeline.incrby(`${REDIS_KEYS.TRAFFIC_INBOUND_UP}${t.inboundId}`, t.upload);
        }
        if (t.download > 0) {
          pipeline.incrby(`${REDIS_KEYS.TRAFFIC_INBOUND_DOWN}${t.inboundId}`, t.download);
        }
      }
      nodeUp += t.upload;
      nodeDown += t.download;
    }

    // Node-level counters
    if (nodeUp > 0) {
      pipeline.incrby(`${REDIS_KEYS.TRAFFIC_NODE_UP}${nodeId}`, nodeUp);
    }
    if (nodeDown > 0) {
      pipeline.incrby(`${REDIS_KEYS.TRAFFIC_NODE_DOWN}${nodeId}`, nodeDown);
    }

    await pipeline.exec();
  }

  async getTrafficCounters(nodeId: string): Promise<{ up: number; down: number }> {
    const [up, down] = await Promise.all([
      this.client.get(`${REDIS_KEYS.TRAFFIC_NODE_UP}${nodeId}`),
      this.client.get(`${REDIS_KEYS.TRAFFIC_NODE_DOWN}${nodeId}`),
    ]);
    return { up: parseInt(up || '0', 10), down: parseInt(down || '0', 10) };
  }

  async getAndResetTrafficCounters(nodeId: string): Promise<{ up: number; down: number }> {
    const upKey = `${REDIS_KEYS.TRAFFIC_NODE_UP}${nodeId}`;
    const downKey = `${REDIS_KEYS.TRAFFIC_NODE_DOWN}${nodeId}`;
    const [up, down] = await Promise.all([
      this.client.getdel(upKey),
      this.client.getdel(downKey),
    ]);
    return { up: parseInt(up || '0', 10), down: parseInt(down || '0', 10) };
  }

  async getAllTrafficCounterKeys(): Promise<string[]> {
    const [nodeUp, nodeDown, clientUp, clientDown, inboundUp, inboundDown] = await Promise.all([
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_NODE_UP}*`),
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_NODE_DOWN}*`),
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_CLIENT_UP}*`),
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_CLIENT_DOWN}*`),
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_INBOUND_UP}*`),
      this.scanKeys(`${REDIS_KEYS.TRAFFIC_INBOUND_DOWN}*`),
    ]);
    return [...nodeUp, ...nodeDown, ...clientUp, ...clientDown, ...inboundUp, ...inboundDown];
  }

  // ============================================
  // Bandwidth Sliding Window (ZSET)
  // ============================================

  async recordBandwidthSample(
    entityType: 'node' | 'inbound' | 'client',
    entityId: string,
    up: number,
    down: number,
  ): Promise<void> {
    let key: string;
    switch (entityType) {
      case 'node': key = `${REDIS_KEYS.BANDWIDTH_NODE}${entityId}`; break;
      case 'inbound': key = `${REDIS_KEYS.BANDWIDTH_INBOUND}${entityId}`; break;
      case 'client': key = `${REDIS_KEYS.BANDWIDTH_CLIENT}${entityId}`; break;
    }
    const timestamp = Date.now();
    const data = JSON.stringify({ up, down, ts: timestamp });
    
    await this.client.zadd(key, timestamp, data);
    // Remove samples older than 1 hour
    await this.client.zremrangebyscore(key, '-inf', timestamp - REDIS_TTL.BANDWIDTH_WINDOW * 1000);
    await this.client.expire(key, REDIS_TTL.BANDWIDTH_WINDOW);
  }

  async getBandwidthHistory(
    entityType: 'node' | 'inbound' | 'client',
    entityId: string,
    sinceMs: number,
  ): Promise<Array<{ up: number; down: number; ts: number }>> {
    let key: string;
    switch (entityType) {
      case 'node': key = `${REDIS_KEYS.BANDWIDTH_NODE}${entityId}`; break;
      case 'inbound': key = `${REDIS_KEYS.BANDWIDTH_INBOUND}${entityId}`; break;
      case 'client': key = `${REDIS_KEYS.BANDWIDTH_CLIENT}${entityId}`; break;
    }
    const items = await this.client.zrangebyscore(key, sinceMs, '+inf');
    return items.map(item => JSON.parse(item));
  }

  async calculateBandwidthRate(
    entityType: 'node' | 'inbound' | 'client',
    entityId: string,
    windowMs = 10000,
  ): Promise<{ upRate: number; downRate: number }> {
    const now = Date.now();
    const samples = await this.getBandwidthHistory(entityType, entityId, now - windowMs);
    
    if (samples.length < 2) {
      return { upRate: 0, downRate: 0 };
    }

    const totalUp = samples.reduce((sum, s) => sum + s.up, 0);
    const totalDown = samples.reduce((sum, s) => sum + s.down, 0);
    const durationSec = windowMs / 1000;

    return {
      upRate: Math.round(totalUp / durationSec),
      downRate: Math.round(totalDown / durationSec),
    };
  }

  // ============================================
  // Load Balancing Support
  // ============================================

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /**
   * Get bandwidth stats for a node (average Mbps over last minute)
   */
  async getBandwidthStats(nodeId: string): Promise<{ avgUpMbps: number; avgDownMbps: number } | null> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const samples = await this.getBandwidthHistory('node', nodeId, now - windowMs);

    if (samples.length < 2) {
      return null;
    }

    const totalUp = samples.reduce((sum, s) => sum + s.up, 0);
    const totalDown = samples.reduce((sum, s) => sum + s.down, 0);
    const durationSec = windowMs / 1000;

    // Convert bytes/sec to Mbps
    return {
      avgUpMbps: Math.round((totalUp / durationSec) * 8 / 1000000 * 100) / 100,
      avgDownMbps: Math.round((totalDown / durationSec) * 8 / 1000000 * 100) / 100,
    };
  }
}
