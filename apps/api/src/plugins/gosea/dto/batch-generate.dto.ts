import { IsString, IsOptional, IsInt, IsArray, IsBoolean, IsEnum, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Batch Generate Socks5 DTOs
// ============================================

export class PortRangeDto {
  @ApiProperty({ example: 8000 }) @IsInt() @Min(1) @Max(65535) min: number;
  @ApiProperty({ example: 9000 }) @IsInt() @Min(1) @Max(65535) max: number;
}

export class BatchGenerateSocks5Dto {
  @ApiProperty({ description: 'Socks5 落地节点 ID' })
  @IsString()
  nodeId: string;

  @ApiProperty({ description: '生成数量', example: 100 })
  @IsInt() @Min(1) @Max(10000)
  count: number;

  @ApiProperty({ description: '入口IP=出口IP', default: true })
  @IsBoolean()
  ingressEqualsEgress: boolean;

  @ApiProperty({ description: '端口模式', enum: ['single', 'range'] })
  @IsEnum(['single', 'range'])
  portMode: 'single' | 'range';

  @ApiPropertyOptional({ description: '单端口模式端口号', example: 1080 })
  @IsOptional() @IsInt() @Min(1) @Max(65535)
  singlePort?: number;

  @ApiPropertyOptional({ description: '端口范围', type: PortRangeDto })
  @IsOptional() @ValidateNested() @Type(() => PortRangeDto)
  portRange?: PortRangeDto;

  @ApiProperty({ description: '超卖数 (每个落地IP重复卖几次)', example: 1 })
  @IsInt() @Min(1) @Max(100)
  oversellCount: number;

  @ApiPropertyOptional({ description: '指定出口IP列表 (不指定则使用节点所有出口IP)', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  egressIps?: string[];

  @ApiPropertyOptional({ description: '过期时间 (ISO string)' })
  @IsOptional() @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '预览模式', default: false })
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

export class BatchSocks5PreviewItem {
  host: string;
  port: number;
  username: string;
  password: string;
  egressIp: string;
  proxyUrl: string;
}

// ============================================
// Batch Generate Relay DTOs
// ============================================

export class Socks5ItemDto {
  @ApiProperty() @IsString() ip: string;
  @ApiProperty() @IsInt() port: number;
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsString() password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

export class BatchGenerateRelayDto {
  @ApiProperty({ description: '转发节点 ID' })
  @IsString()
  relayNodeId: string;

  @ApiProperty({ description: '协议', enum: ['vless', 'vmess', 'shadowsocks', 'trojan'] })
  @IsEnum(['vless', 'vmess', 'shadowsocks', 'trojan'])
  protocol: 'vless' | 'vmess' | 'shadowsocks' | 'trojan';

  @ApiProperty({ description: '批量导入的 Socks5 列表', type: [Socks5ItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => Socks5ItemDto)
  socks5List: Socks5ItemDto[];

  @ApiProperty({ description: '端口模式', enum: ['shared', 'per_user'] })
  @IsEnum(['shared', 'per_user'])
  portMode: 'shared' | 'per_user';

  @ApiPropertyOptional({ description: '共享端口号', example: 443 })
  @IsOptional() @IsInt() @Min(1) @Max(65535)
  sharedPort?: number;

  @ApiPropertyOptional({ description: '端口范围 (per_user 模式)', type: PortRangeDto })
  @IsOptional() @ValidateNested() @Type(() => PortRangeDto)
  portRange?: PortRangeDto;

  @ApiPropertyOptional({ description: '指定入站IP (深港专线等)' })
  @IsOptional() @IsString()
  ingressIp?: string;

  @ApiPropertyOptional({ description: '过期时间 (ISO string)' })
  @IsOptional() @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '预览模式', default: false })
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

// ============================================
// Batch Generate Relay Auto (from existing Socks5 nodes)
// ============================================

export class BatchGenerateRelayAutoDto {
  @ApiProperty({ description: '转发节点 ID' })
  @IsString()
  relayNodeId: string;

  @ApiProperty({ description: '协议', enum: ['vless', 'vmess', 'shadowsocks', 'trojan'] })
  @IsEnum(['vless', 'vmess', 'shadowsocks', 'trojan'])
  protocol: 'vless' | 'vmess' | 'shadowsocks' | 'trojan';

  @ApiProperty({ description: 'Socks5 落地节点 ID 列表 (自动获取这些节点的 Socks5)', type: [String] })
  @IsArray() @IsString({ each: true })
  socks5NodeIds: string[];

  @ApiProperty({ description: '端口模式', enum: ['shared', 'per_user'] })
  @IsEnum(['shared', 'per_user'])
  portMode: 'shared' | 'per_user';

  @ApiPropertyOptional({ description: '共享端口号', example: 443 })
  @IsOptional() @IsInt() @Min(1) @Max(65535)
  sharedPort?: number;

  @ApiPropertyOptional({ description: '端口范围 (per_user 模式)', type: PortRangeDto })
  @IsOptional() @ValidateNested() @Type(() => PortRangeDto)
  portRange?: PortRangeDto;

  @ApiPropertyOptional({ description: '指定入站IP (深港专线等)' })
  @IsOptional() @IsString()
  ingressIp?: string;

  @ApiPropertyOptional({ description: '过期时间 (ISO string)' })
  @IsOptional() @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: '预览模式', default: false })
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

export class BatchRelayPreviewItem {
  protocol: string;
  host: string;
  port: number;
  uuid: string;
  password?: string;
  connectUrl: string;
  targetSocks5: { ip: string; port: number };
  remark?: string;
}

// ============================================
// GoSea Settings DTOs
// ============================================

export class GoSeaSettingsDto {
  @ApiPropertyOptional({ enum: ['vless', 'vmess', 'shadowsocks', 'trojan'] })
  @IsOptional() @IsEnum(['vless', 'vmess', 'shadowsocks', 'trojan'])
  defaultProtocol?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsInt() @Min(1) @Max(100)
  defaultOversellCount?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional() @IsInt() @Min(1) @Max(65535)
  defaultSocks5Port?: number;

  @ApiPropertyOptional({ example: 443 })
  @IsOptional() @IsInt() @Min(1) @Max(65535)
  defaultRelayPort?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  autoGenerateUsername?: boolean;

  @ApiPropertyOptional({ example: 'gs' })
  @IsOptional() @IsString()
  usernamePrefix?: string;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional() @IsInt() @Min(8) @Max(64)
  passwordLength?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional() @IsInt() @Min(1) @Max(10000)
  maxBatchSize?: number;
}

// ============================================
// Node GoSea Config DTOs
// ============================================

export class NodeGoSeaConfigDto {
  @ApiPropertyOptional({ description: 'Socks5 端口范围', type: PortRangeDto })
  @IsOptional() @ValidateNested() @Type(() => PortRangeDto)
  socks5PortRange?: PortRangeDto;

  @ApiPropertyOptional({ description: '可用出口IP列表', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  egressIps?: string[];

  @ApiPropertyOptional({ description: 'Relay 端口范围', type: PortRangeDto })
  @IsOptional() @ValidateNested() @Type(() => PortRangeDto)
  relayPortRange?: PortRangeDto;

  @ApiPropertyOptional({ description: '入站IP列表 (深港专线等)', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  ingressIps?: string[];

  @ApiPropertyOptional({ description: '最大连接数' })
  @IsOptional() @IsInt() @Min(1)
  maxConnections?: number;

  @ApiPropertyOptional({ description: '带宽限制 (Mbps)' })
  @IsOptional() @IsInt() @Min(1)
  bandwidthLimit?: number;
}
