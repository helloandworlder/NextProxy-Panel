import { IsString, IsOptional, IsInt, IsArray, Min, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Socks5 Pool DTOs
// ============================================

export class Socks5ProxyDto {
  @ApiProperty() @IsString() ip: string;
  @ApiProperty() @IsInt() port: number;
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() password: string;
  @ApiProperty() @IsString() countryCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ispType?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxAllocations?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expiresAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceProxyId?: string;
}

export class AddToPoolDto {
  @ApiProperty({ type: [Socks5ProxyDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => Socks5ProxyDto)
  proxies: Socks5ProxyDto[];
}

export class AllocateSocks5Dto {
  @ApiProperty() @IsString() externalOrderId: string;
  @ApiProperty() @IsString() externalUserId: string;
  @ApiProperty() @IsString() countryCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityCode?: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiProperty() @IsInt() @Min(1) days: number;
}

export class ReleaseSocks5Dto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true })
  allocationIds: string[];
}

// ============================================
// Relay DTOs
// ============================================

export class TargetSocks5Dto {
  @ApiProperty() @IsString() ip: string;
  @ApiProperty() @IsInt() port: number;
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() password: string;
}

export class CreateRelayDto {
  @ApiProperty() @IsString() externalOrderId: string;
  @ApiProperty() @IsString() externalUserId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() allocationId?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => TargetSocks5Dto)
  targetSocks5?: TargetSocks5Dto;
  @ApiPropertyOptional({ enum: ['vless', 'shadowsocks'] })
  @IsOptional() @IsEnum(['vless', 'shadowsocks']) protocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preferredRegion?: string;
}

export class UpdateRelayDto {
  @ApiPropertyOptional({ enum: ['active', 'suspended'] })
  @IsOptional() @IsEnum(['active', 'suspended']) status?: string;
}

// ============================================
// Single Port Multi-Egress DTOs
// ============================================

export class SinglePortMultiEgressDto {
  @ApiProperty({ description: 'Node ID' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Shared Socks5 port', example: 1080 })
  @IsInt()
  @Min(1)
  port: number;

  @ApiProperty({ description: 'List of egress IP addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  egressIps: string[];

  @ApiProperty({ description: 'Number of user:pass pairs per egress IP', example: 5 })
  @IsInt()
  @Min(1)
  countPerIp: number;

  @ApiPropertyOptional({ description: 'Expiry date (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Dry run mode - preview only', default: false })
  @IsOptional()
  dryRun?: boolean;
}

export class SinglePortMultiEgressPreviewItem {
  username: string;
  password: string;
  egressIp: string;
  proxyUrl: string;
}

// ============================================
// Export DTOs
// ============================================

export class ExportProxiesDto {
  @ApiProperty({ description: 'Node ID' })
  @IsString()
  nodeId: string;

  @ApiPropertyOptional({ description: 'Export format', enum: ['txt', 'csv', 'json'], default: 'txt' })
  @IsOptional()
  @IsEnum(['txt', 'csv', 'json'])
  format?: 'txt' | 'csv' | 'json';
}
