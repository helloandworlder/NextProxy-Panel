/**
 * Agent DTO v3 - Simplified for Xray-only architecture
 * Removed sing-box/CoreType references
 */

import { IsArray, IsNumber, IsString, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Traffic Report
// ============================================

class TrafficItem {
  @ApiProperty({ description: 'Client email identifier' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Upload bytes since last report' })
  @IsNumber()
  upload: number;

  @ApiProperty({ description: 'Download bytes since last report' })
  @IsNumber()
  download: number;
}

export class ReportTrafficDto {
  @ApiProperty({ type: [TrafficItem], description: 'Per-user traffic data' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrafficItem)
  traffics: TrafficItem[];
}

// ============================================
// Status Report
// ============================================

export class ReportStatusDto {
  @ApiProperty({ description: 'CPU usage percentage (0-100)' })
  @IsNumber()
  cpuUsage: number;

  @ApiProperty({ description: 'Memory usage percentage (0-100)' })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: 'Disk usage percentage (0-100)' })
  @IsNumber()
  diskUsage: number;

  @ApiProperty({ description: 'Uptime in seconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Number of online users' })
  @IsNumber()
  onlineUsers: number;

  @ApiPropertyOptional({ description: 'Xray-core version' })
  @IsOptional()
  @IsString()
  xrayVersion?: string;
}

// ============================================
// Alive Users Report
// ============================================

class AliveUser {
  @ApiProperty({ description: 'Client email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Client IP address' })
  @IsString()
  ip: string;

  @ApiPropertyOptional({ description: 'Device identifier' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ReportAliveDto {
  @ApiProperty({ type: [AliveUser], description: 'Currently connected users' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AliveUser)
  aliveUsers: AliveUser[];
}

// ============================================
// Egress IPs Report
// ============================================

class EgressIpItem {
  @ApiProperty({ description: 'IP address' })
  @IsString()
  ip: string;

  @ApiProperty({ description: 'IP version (4 or 6)' })
  @IsNumber()
  version: number;

  @ApiPropertyOptional({ description: 'Network interface name' })
  @IsOptional()
  @IsString()
  interfaceName?: string;

  @ApiPropertyOptional({ description: 'IP type: datacenter, residential, mobile' })
  @IsOptional()
  @IsString()
  ipType?: string;

  @ApiPropertyOptional({ description: 'ISP name' })
  @IsOptional()
  @IsString()
  isp?: string;

  @ApiPropertyOptional({ description: 'ASN' })
  @IsOptional()
  @IsString()
  asn?: string;

  @ApiProperty({ description: 'Whether IP is active' })
  @IsBoolean()
  isActive: boolean;
}

export class ReportEgressIpsDto {
  @ApiProperty({ type: [EgressIpItem], description: 'Egress IP list' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EgressIpItem)
  ips: EgressIpItem[];
}

// ============================================
// Node Registration
// ============================================

export class RegisterNodeDto {
  @ApiProperty({ description: 'Server hostname' })
  @IsString()
  hostname: string;

  @ApiProperty({ description: 'Operating system' })
  @IsString()
  os: string;

  @ApiProperty({ description: 'CPU architecture' })
  @IsString()
  arch: string;

  @ApiPropertyOptional({ description: 'Public IP address' })
  @IsOptional()
  @IsString()
  publicIp?: string;

  @ApiPropertyOptional({ description: 'Xray-core version' })
  @IsOptional()
  @IsString()
  xrayVersion?: string;

  @ApiPropertyOptional({ description: 'Agent version' })
  @IsOptional()
  @IsString()
  version?: string;
}

// ============================================
// Response Types
// ============================================

export class ConfigResponse {
  @ApiProperty({ description: 'Complete Xray configuration JSON' })
  config: Record<string, any>;

  @ApiProperty({ description: 'ETag for caching' })
  etag: string;
}

export class UsersResponse {
  @ApiProperty({ description: 'Valid users list' })
  users: UserItem[];

  @ApiProperty({ description: 'Rate limit configurations' })
  rateLimits: RateLimitItem[];

  @ApiProperty({ description: 'ETag for caching' })
  etag: string;
}

class UserItem {
  email: string;
  uuid?: string;
  password?: string;
  flow?: string;
  method?: string;
  level: number;
  inboundTags: string[];
  outboundTag?: string;
  totalBytes: number;
  usedBytes: number;
  expiryTime: number;
  uploadLimit: number;
  downloadLimit: number;
  deviceLimit: number;
}

class RateLimitItem {
  email: string;
  uploadBytesPerSec: number;
  downloadBytesPerSec: number;
}

export class RegisterResponse {
  @ApiProperty({ description: 'Node ID' })
  nodeId: string;

  @ApiProperty({ description: 'Node name' })
  nodeName: string;

  @ApiProperty({ description: 'Config poll interval in seconds' })
  configPollInterval: number;

  @ApiProperty({ description: 'Traffic report interval in seconds' })
  trafficReportInterval: number;

  @ApiProperty({ description: 'Status report interval in seconds' })
  statusReportInterval: number;

  @ApiProperty({ description: 'Alive poll interval in seconds' })
  alivePollInterval: number;
}
