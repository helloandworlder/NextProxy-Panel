# Panel Database Migration v3.0 - 3x-ui Style Simplification

## Overview
This migration simplifies the database schema from v2.1 to v3.0, adopting 3x-ui style pure JSON passthrough for Xray configurations.

## Breaking Changes

### 1. Inbound Table
**Removed Fields:**
- `securityType`, `tlsServerName`, `tlsCertPath`, `tlsKeyPath`
- `realityDest`, `realityServerNames`, `realityPrivateKey`, `realityShortIds`
- `transportType`, `wsPath`, `wsHost`, `grpcServiceName`, `h2Path`
- `sniffingEnabled`, `sniffingDestOverride`, `sniffingRouteOnly`
- `protocolSettings`, `allocate`

**Changed Fields:**
- `settings`: Json → String (TEXT) - Pure JSON passthrough
- `streamSettings`: Json → String (TEXT) - Pure JSON passthrough
- `sniffing`: Json → String (TEXT) - Pure JSON passthrough

### 2. Outbound Table
**Removed Fields:**
- `securityType`, `tlsServerName`, `tlsFingerprint`
- `transportType`, `wsPath`, `grpcServiceName`
- `protocolSettings`

**Changed Fields:**
- `settings`: Json → String (TEXT)
- `streamSettings`: Json → String (TEXT)
- `proxySettings`: Json → String (TEXT)
- `muxSettings`: Json → String (TEXT)

### 3. Client Table
**Removed Fields:**
- `alterId`, `security` (VMess legacy)
- `trafficResetDay`, `lastTrafficReset`, `monthlyUsedBytes`
- `outboundId` (replaced by `outboundTag`)

**Added Fields:**
- `outboundTag`: String - Direct tag reference
- `inboundTags`: String[] - Array of inbound tags

### 4. Deleted Tables
- `ClientInboundAccess` - Replaced by `Client.inboundTags`
- `ClientTraffic` - Replaced by `ClientStats`
- `ClientOnlineLog` - Moved to Redis
- `TrafficStats` - Simplified to `ClientStats`

### 5. New Tables
- `ClientStats` - Simplified traffic stats per client/node/inbound

## Migration Steps

### Step 1: Backup
```bash
pg_dump -h localhost -U postgres panel_db > backup_v2.sql
```

### Step 2: Run Migration
```bash
npx prisma migrate dev --name v3_simplification
```

### Step 3: Data Migration Script
Run the TypeScript migration script to convert existing data.

## Rollback Plan
1. Restore from backup: `psql -h localhost -U postgres panel_db < backup_v2.sql`
2. Revert schema: `mv prisma/schema.prisma.bak prisma/schema.prisma`
3. Regenerate client: `npx prisma generate`
