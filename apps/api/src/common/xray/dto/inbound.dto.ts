/**
 * Xray DTO Types - Simplified DTOs for v3 API
 * These DTOs are used by frontend and converted to JSON strings by XrayConfigBuilder
 */

import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Enums
// ============================================

export enum XrayProtocol {
  VLESS = 'vless',
  VMESS = 'vmess',
  TROJAN = 'trojan',
  SHADOWSOCKS = 'shadowsocks',
  SOCKS = 'socks',
  HTTP = 'http',
  DOKODEMO = 'dokodemo-door',
  FREEDOM = 'freedom',
  BLACKHOLE = 'blackhole',
}

export enum SecurityType {
  NONE = 'none',
  TLS = 'tls',
  REALITY = 'reality',
}

export enum TransportType {
  TCP = 'tcp',
  WS = 'ws',
  GRPC = 'grpc',
  H2 = 'h2',
  QUIC = 'quic',
  KCP = 'kcp',
}

// ============================================
// Inbound DTOs
// ============================================

export class TlsSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keyPath?: string;
}

export class RealitySettingsDto {
  @ApiProperty()
  @IsString()
  dest: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  serverNames: string[];

  @ApiProperty()
  @IsString()
  privateKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shortIds?: string[];
}

export class WsSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;
}

export class GrpcSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  multiMode?: boolean;
}

export class SniffingSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  destOverride?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  routeOnly?: boolean;
}

export class CreateInboundDto {
  @ApiProperty()
  @IsString()
  tag: string;

  @ApiProperty({ enum: XrayProtocol })
  @IsEnum(XrayProtocol)
  protocol: XrayProtocol;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listen?: string;

  @ApiPropertyOptional({ enum: SecurityType })
  @IsOptional()
  @IsEnum(SecurityType)
  securityType?: SecurityType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TlsSettingsDto)
  tlsSettings?: TlsSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RealitySettingsDto)
  realitySettings?: RealitySettingsDto;

  @ApiPropertyOptional({ enum: TransportType })
  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WsSettingsDto)
  wsSettings?: WsSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GrpcSettingsDto)
  grpcSettings?: GrpcSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SniffingSettingsDto)
  sniffingSettings?: SniffingSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class UpdateInboundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listen?: string;

  @ApiPropertyOptional({ enum: SecurityType })
  @IsOptional()
  @IsEnum(SecurityType)
  securityType?: SecurityType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TlsSettingsDto)
  tlsSettings?: TlsSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RealitySettingsDto)
  realitySettings?: RealitySettingsDto;

  @ApiPropertyOptional({ enum: TransportType })
  @IsOptional()
  @IsEnum(TransportType)
  transportType?: TransportType;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WsSettingsDto)
  wsSettings?: WsSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GrpcSettingsDto)
  grpcSettings?: GrpcSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SniffingSettingsDto)
  sniffingSettings?: SniffingSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}
