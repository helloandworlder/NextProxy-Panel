import { IsString, IsInt, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, description: 'VLESS flow: xtls-rprx-vision' })
  @IsOptional()
  @IsString()
  flow?: string;

  @ApiProperty({ required: false, description: 'Shadowsocks cipher method' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  level?: number;

  @ApiProperty({ required: false, default: '0', description: '0 = unlimited' })
  @IsOptional()
  totalBytes?: string;

  @ApiProperty({ required: false, default: '0', description: 'Unix timestamp ms, 0 = never expire' })
  @IsOptional()
  expiryTime?: string;

  @ApiProperty({ required: false, default: '0', description: 'Upload limit bytes/s' })
  @IsOptional()
  uploadLimit?: string;

  @ApiProperty({ required: false, default: '0', description: 'Download limit bytes/s' })
  @IsOptional()
  downloadLimit?: string;

  @ApiProperty({ required: false, default: 0, description: 'Max devices, 0 = unlimited' })
  @IsOptional()
  @IsInt()
  deviceLimit?: number;

  // 3x-ui style advanced features
  @ApiProperty({ required: false, default: 0, description: 'Max concurrent IPs, 0 = unlimited' })
  @IsOptional()
  @IsInt()
  limitIp?: number;

  @ApiProperty({ required: false, default: 0, description: 'Traffic reset period in days, 0 = never' })
  @IsOptional()
  @IsInt()
  reset?: number;

  @ApiProperty({ required: false, default: false, description: 'Start expiry countdown on first connection' })
  @IsOptional()
  @IsBoolean()
  delayedStart?: boolean;

  @ApiProperty({ required: false, description: 'Telegram ChatID for notifications' })
  @IsOptional()
  @IsString()
  tgId?: string;

  @ApiProperty({ required: false, description: 'User comment/note' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ required: false, description: 'Outbound tag for per-user routing' })
  @IsOptional()
  @IsString()
  outboundTag?: string;

  @ApiProperty({ required: false, type: [String], description: 'Inbound tags this client can access' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inboundTags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

// Bulk create clients DTO (3x-ui style)
export class BulkCreateClientsDto {
  @ApiProperty({ description: 'Email generation method: 0=random, 1=random+prefix, 2=random+prefix+num, 3=random+prefix+num+postfix, 4=prefix+num+postfix' })
  @IsInt()
  emailMethod: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  firstNum?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  lastNum?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emailPrefix?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emailPostfix?: string;

  @ApiProperty({ required: false, default: 1, description: 'Number of clients to create (for method 0,1)' })
  @IsOptional()
  @IsInt()
  quantity?: number;

  @ApiProperty({ required: false, default: '0' })
  @IsOptional()
  totalBytes?: string;

  @ApiProperty({ required: false, default: '0' })
  @IsOptional()
  expiryTime?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  limitIp?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  reset?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  delayedStart?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tgId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inboundTags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  outboundTag?: string;
}
