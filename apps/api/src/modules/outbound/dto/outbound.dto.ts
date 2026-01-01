import { IsString, IsInt, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateOutboundDto {
  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty({ example: 'direct' })
  @IsString()
  tag: string;

  @ApiProperty({ example: 'freedom', enum: ['freedom', 'blackhole', 'dns', 'socks', 'http', 'vmess', 'vless', 'trojan', 'shadowsocks', 'wireguard', 'loopback'] })
  @IsString()
  protocol: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sendThrough?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  egressIpId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  streamSettings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  proxySettings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  muxSettings?: Record<string, any>;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateOutboundDto extends PartialType(CreateOutboundDto) {}
