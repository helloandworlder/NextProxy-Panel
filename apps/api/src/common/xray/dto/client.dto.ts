/**
 * Client DTO Types - Simplified DTOs for v3 API
 */

import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Client DTOs
// ============================================

export class CreateClientDto {
  @ApiProperty({ description: 'Unique email identifier for Xray stats' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'UUID for VLESS/VMess protocols' })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiPropertyOptional({ description: 'Password for Trojan/Shadowsocks/Socks/HTTP' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'VLESS flow: xtls-rprx-vision' })
  @IsOptional()
  @IsString()
  flow?: string;

  @ApiPropertyOptional({ description: 'Shadowsocks cipher method' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'User level for policy' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({ description: 'Total traffic quota in bytes (0 = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBytes?: number;

  @ApiPropertyOptional({ description: 'Expiry timestamp in milliseconds (0 = never)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expiryTime?: number;

  @ApiPropertyOptional({ description: 'Upload speed limit in bytes/s (0 = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  uploadLimit?: number;

  @ApiPropertyOptional({ description: 'Download speed limit in bytes/s (0 = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downloadLimit?: number;

  @ApiPropertyOptional({ description: 'Max concurrent devices (0 = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deviceLimit?: number;

  @ApiPropertyOptional({ description: 'Outbound tag for per-user routing' })
  @IsOptional()
  @IsString()
  outboundTag?: string;

  @ApiPropertyOptional({ description: 'Inbound tags this client can access' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inboundTags?: string[];

  @ApiPropertyOptional({ description: 'Subscription ID for client grouping' })
  @IsOptional()
  @IsString()
  subId?: string;

  @ApiPropertyOptional({ description: 'Client remark/note' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: 'Enable/disable client' })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  flow?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  expiryTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  uploadLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  downloadLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  deviceLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outboundTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inboundTags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class BatchAddClientsDto {
  @ApiProperty({ description: 'Inbound tags to add clients to' })
  @IsArray()
  @IsString({ each: true })
  inboundTags: string[];

  @ApiProperty({ description: 'Clients to add', type: [CreateClientDto] })
  @IsArray()
  clients: CreateClientDto[];
}

export class ResetClientTrafficDto {
  @ApiProperty({ description: 'Client IDs to reset' })
  @IsArray()
  @IsUUID('4', { each: true })
  clientIds: string[];
}
