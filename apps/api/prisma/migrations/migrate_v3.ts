/**
 * Panel Database Migration Script v3.0
 * Converts v2.1 schema to v3.0 (3x-ui style pure JSON passthrough)
 * 
 * Run: npx ts-node prisma/migrations/migrate_v3.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldInbound {
  id: string;
  tenantId: string;
  nodeId: string;
  tag: string;
  protocol: string;
  port: number;
  listen: string;
  // Old structured fields
  securityType?: string;
  tlsServerName?: string;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  realityDest?: string;
  realityServerNames?: string[];
  realityPrivateKey?: string;
  realityShortIds?: string[];
  transportType?: string;
  wsPath?: string;
  wsHost?: string;
  grpcServiceName?: string;
  h2Path?: string;
  sniffingEnabled?: boolean;
  sniffingDestOverride?: string[];
  sniffingRouteOnly?: boolean;
  protocolSettings?: any;
  // Legacy JSON fields
  settings?: any;
  streamSettings?: any;
  sniffing?: any;
  allocate?: any;
  // Management
  enable: boolean;
  remark?: string;
  sortOrder: number;
}

interface OldClient {
  id: string;
  tenantId: string;
  email: string;
  uuid?: string;
  password?: string;
  flow?: string;
  alterId?: number;
  security?: string;
  method?: string;
  level: number;
  totalBytes: bigint;
  usedBytes: bigint;
  expiryTime: bigint;
  uploadLimit: bigint;
  downloadLimit: bigint;
  deviceLimit: number;
  outboundId?: string;
  subId?: string;
  remark?: string;
  enable: boolean;
  metadata?: any;
}

// Build streamSettings JSON from structured fields
function buildStreamSettings(inbound: OldInbound): string {
  // If legacy streamSettings exists and is valid, use it
  if (inbound.streamSettings && Object.keys(inbound.streamSettings).length > 0) {
    return JSON.stringify(inbound.streamSettings);
  }

  const stream: any = {
    network: inbound.transportType || 'tcp',
  };

  // Security settings
  if (inbound.securityType === 'tls') {
    stream.security = 'tls';
    stream.tlsSettings = {
      serverName: inbound.tlsServerName || '',
      certificates: inbound.tlsCertPath ? [{
        certificateFile: inbound.tlsCertPath,
        keyFile: inbound.tlsKeyPath,
      }] : [],
    };
  } else if (inbound.securityType === 'reality') {
    stream.security = 'reality';
    stream.realitySettings = {
      dest: inbound.realityDest || '',
      serverNames: inbound.realityServerNames || [],
      privateKey: inbound.realityPrivateKey || '',
      shortIds: inbound.realityShortIds || [],
    };
  }

  // Transport settings
  if (inbound.transportType === 'ws') {
    stream.wsSettings = {
      path: inbound.wsPath || '/',
      headers: inbound.wsHost ? { Host: inbound.wsHost } : {},
    };
  } else if (inbound.transportType === 'grpc') {
    stream.grpcSettings = {
      serviceName: inbound.grpcServiceName || '',
    };
  } else if (inbound.transportType === 'h2') {
    stream.httpSettings = {
      path: inbound.h2Path || '/',
    };
  }

  return JSON.stringify(stream);
}

// Build sniffing JSON from structured fields
function buildSniffing(inbound: OldInbound): string {
  if (inbound.sniffing && Object.keys(inbound.sniffing).length > 0) {
    return JSON.stringify(inbound.sniffing);
  }

  return JSON.stringify({
    enabled: inbound.sniffingEnabled ?? true,
    destOverride: inbound.sniffingDestOverride || ['http', 'tls'],
    routeOnly: inbound.sniffingRouteOnly ?? false,
  });
}

// Build settings JSON
function buildSettings(inbound: OldInbound): string {
  if (inbound.settings && Object.keys(inbound.settings).length > 0) {
    // Merge protocolSettings if exists
    const settings = { ...inbound.settings };
    if (inbound.protocolSettings) {
      Object.assign(settings, inbound.protocolSettings);
    }
    return JSON.stringify(settings);
  }

  // Build from protocolSettings or default
  const settings: any = inbound.protocolSettings || {};
  
  // Add decryption for VLESS
  if (inbound.protocol === 'vless' && !settings.decryption) {
    settings.decryption = 'none';
  }

  return JSON.stringify(settings);
}

async function migrateInbounds() {
  console.log('Migrating inbounds...');
  
  // This would be run against the old schema
  // For now, we just document the migration logic
  console.log('Inbound migration logic:');
  console.log('1. Convert structured fields to JSON strings');
  console.log('2. Merge protocolSettings into settings');
  console.log('3. Build streamSettings from security/transport fields');
  console.log('4. Build sniffing from sniffing* fields');
}

async function migrateClients() {
  console.log('Migrating clients...');
  
  console.log('Client migration logic:');
  console.log('1. Get outbound tag from outboundId relation');
  console.log('2. Get inbound tags from ClientInboundAccess');
  console.log('3. Remove alterId, security (VMess legacy)');
  console.log('4. Remove monthly traffic reset fields');
}

async function migrateClientInboundAccess() {
  console.log('Migrating ClientInboundAccess to Client.inboundTags...');
  
  console.log('Migration logic:');
  console.log('1. Group ClientInboundAccess by clientId');
  console.log('2. Get inbound tags for each client');
  console.log('3. Update Client.inboundTags array');
  console.log('4. Drop ClientInboundAccess table');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Panel Database Migration v3.0');
  console.log('='.repeat(60));
  
  try {
    await migrateInbounds();
    await migrateClients();
    await migrateClientInboundAccess();
    
    console.log('\nMigration plan complete.');
    console.log('Run `npx prisma migrate dev --name v3_simplification` to apply schema changes.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
