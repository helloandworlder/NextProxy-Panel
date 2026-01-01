import { IsString, IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateInboundDto {
  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty({ example: 'vless-tcp' })
  @IsString()
  tag: string;

  @ApiProperty({ example: 'vless', enum: ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'dokodemo-door'] })
  @IsString()
  protocol: string;

  @ApiProperty({ example: 443 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @ApiProperty({ required: false, default: '0.0.0.0' })
  @IsOptional()
  @IsString()
  listen?: string;

  @ApiProperty({ required: false, description: 'Xray inbound settings (JSON string passthrough)' })
  @IsOptional()
  settings?: Record<string, any> | string;

  @ApiProperty({ required: false, description: 'Xray stream settings (JSON string passthrough)' })
  @IsOptional()
  streamSettings?: Record<string, any> | string;

  @ApiProperty({ required: false, description: 'Xray sniffing settings (JSON string passthrough)' })
  @IsOptional()
  sniffing?: Record<string, any> | string;

  @ApiProperty({ required: false, description: 'Xray allocate settings (JSON string passthrough)' })
  @IsOptional()
  allocate?: Record<string, any> | string;

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

export class UpdateInboundDto extends PartialType(CreateInboundDto) {}
