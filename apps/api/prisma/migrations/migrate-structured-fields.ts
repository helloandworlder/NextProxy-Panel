/**
 * Migration script: Extract structured fields from legacy JSONB
 * Run this after applying the Prisma migration
 * 
 * Usage: bun run prisma/migrations/migrate-structured-fields.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StreamSettings {
  network?: string;
  security?: string;
  tlsSettings?: {
    serverName?: string;
    certificates?: Array<{
      certificateFile?: string;
      keyFile?: string;
    }>;
  };
  realitySettings?: {
    dest?: string;
    serverNames?: string[];
    privateKey?: string;
    shortIds?: string[];
  };
  wsSettings?: {
    path?: string;
    headers?: { Host?: string };
  };
  grpcSettings?: {
    serviceName?: string;
  };
  httpSettings?: {
    path?: string;
  };
}

interface SniffingSettings {
  enabled?: boolean;
  destOverride?: string[];
  routeOnly?: boolean;
}

async function migrateInbounds() {
  console.log('Migrating inbounds...');
  
  const inbounds = await prisma.inbound.findMany();
  let migrated = 0;
  
  for (const inbound of inbounds) {
    const stream = (inbound.streamSettings || {}) as StreamSettings;
    const sniff = (inbound.sniffing || {}) as SniffingSettings;
    
    // Extract security config
    const securityType = stream.security || 'none';
    let tlsServerName: string | null = null;
    let tlsCertPath: string | null = null;
    let tlsKeyPath: string | null = null;
    let realityDest: string | null = null;
    let realityServerNames: string[] = [];
    let realityPrivateKey: string | null = null;
    let realityShortIds: string[] = [];
    
    if (securityType === 'tls' && stream.tlsSettings) {
      tlsServerName = stream.tlsSettings.serverName || null;
      if (stream.tlsSettings.certificates?.[0]) {
        tlsCertPath = stream.tlsSettings.certificates[0].certificateFile || null;
        tlsKeyPath = stream.tlsSettings.certificates[0].keyFile || null;
      }
    } else if (securityType === 'reality' && stream.realitySettings) {
      realityDest = stream.realitySettings.dest || null;
      realityServerNames = stream.realitySettings.serverNames || [];
      realityPrivateKey = stream.realitySettings.privateKey || null;
      realityShortIds = stream.realitySettings.shortIds || [];
    }
    
    // Extract transport config
    const network = stream.network || 'tcp';
    const transportType = network === 'http' ? 'h2' : network;
    let wsPath: string | null = null;
    let wsHost: string | null = null;
    let grpcServiceName: string | null = null;
    let h2Path: string | null = null;
    
    if (network === 'ws' && stream.wsSettings) {
      wsPath = stream.wsSettings.path || null;
      wsHost = stream.wsSettings.headers?.Host || null;
    } else if (network === 'grpc' && stream.grpcSettings) {
      grpcServiceName = stream.grpcSettings.serviceName || null;
    } else if (network === 'http' && stream.httpSettings) {
      h2Path = stream.httpSettings.path || null;
    }
    
    // Extract sniffing config
    const sniffingEnabled = sniff.enabled ?? true;
    const sniffingDestOverride = sniff.destOverride || ['http', 'tls'];
    const sniffingRouteOnly = sniff.routeOnly ?? false;
    
    // Update with structured fields
    await prisma.inbound.update({
      where: { id: inbound.id },
      data: {
        securityType,
        tlsServerName,
        tlsCertPath,
        tlsKeyPath,
        realityDest,
        realityServerNames,
        realityPrivateKey,
        realityShortIds,
        transportType,
        wsPath,
        wsHost,
        grpcServiceName,
        h2Path,
        sniffingEnabled,
        sniffingDestOverride,
        sniffingRouteOnly,
        protocolSettings: inbound.settings || {},
      },
    });
    
    migrated++;
  }
  
  console.log(`Migrated ${migrated} inbounds`);
}

async function migrateOutbounds() {
  console.log('Migrating outbounds...');
  
  const outbounds = await prisma.outbound.findMany();
  let migrated = 0;
  
  for (const outbound of outbounds) {
    const stream = (outbound.streamSettings || {}) as StreamSettings & {
      tlsSettings?: { fingerprint?: string };
    };
    
    // Extract security config
    const securityType = stream.security || 'none';
    let tlsServerName: string | null = null;
    let tlsFingerprint: string | null = null;
    
    if (securityType === 'tls' && stream.tlsSettings) {
      tlsServerName = stream.tlsSettings.serverName || null;
      tlsFingerprint = stream.tlsSettings.fingerprint || null;
    }
    
    // Extract transport config
    const network = stream.network || 'tcp';
    const transportType = network === 'http' ? 'h2' : network;
    let wsPath: string | null = null;
    let grpcServiceName: string | null = null;
    
    if (network === 'ws' && stream.wsSettings) {
      wsPath = stream.wsSettings.path || null;
    } else if (network === 'grpc' && stream.grpcSettings) {
      grpcServiceName = stream.grpcSettings.serviceName || null;
    }
    
    // Update with structured fields
    await prisma.outbound.update({
      where: { id: outbound.id },
      data: {
        securityType,
        tlsServerName,
        tlsFingerprint,
        transportType,
        wsPath,
        grpcServiceName,
        protocolSettings: outbound.settings || {},
      },
    });
    
    migrated++;
  }
  
  console.log(`Migrated ${migrated} outbounds`);
}

async function main() {
  console.log('Starting migration of structured fields...');
  
  try {
    await migrateInbounds();
    await migrateOutbounds();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
