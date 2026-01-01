import { IsString, IsOptional, IsInt, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Socks5 Generate DTOs
// ============================================

export class GenerateSocks5Dto {
  @ApiProperty({ description: 'Node ID to generate Socks5 on' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: 'Number of Socks5 users to generate', minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  count: number;

  @ApiPropertyOptional({ description: 'Port for Socks5 inbound', default: 1080 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ enum: ['single_port', 'multi_ip_random'], default: 'single_port' })
  @IsOptional()
  @IsEnum(['single_port', 'multi_ip_random'])
  portStrategy?: 'single_port' | 'multi_ip_random';

  @ApiPropertyOptional({ description: 'Custom UID to avoid duplicate allocation to same egress IP' })
  @IsOptional()
  @IsString()
  customUid?: string;

  @ApiPropertyOptional({ description: 'Specific egress IP ID to use' })
  @IsOptional()
  @IsString()
  egressIpId?: string;

  @ApiPropertyOptional({ description: 'Expiry date (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

// ============================================
// Relay DTOs
// ============================================

export class TargetSocks5Dto {
  @ApiProperty() @IsString() ip: string;
  @ApiProperty() @IsInt() @Min(1) @Max(65535) port: number;
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() password: string;
}

export class CreateRelayDto {
  @ApiProperty({ description: 'Relay node ID' })
  @IsString()
  nodeId: string;

  @ApiProperty({ enum: ['vless', 'vmess', 'shadowsocks'], default: 'vless' })
  @IsEnum(['vless', 'vmess', 'shadowsocks'])
  protocol: 'vless' | 'vmess' | 'shadowsocks';

  @ApiPropertyOptional({ description: 'Inbound port', default: 443 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty({ description: 'Target Socks5 proxy' })
  @ValidateNested()
  @Type(() => TargetSocks5Dto)
  targetSocks5: TargetSocks5Dto;

  @ApiPropertyOptional({ description: 'Remark/name for this relay' })
  @IsOptional()
  @IsString()
  remark?: string;
}
