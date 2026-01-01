import { IsString, IsOptional, IsObject, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateDnsConfigDto {
  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiPropertyOptional({ description: 'Xray DNS config (hosts, servers, clientIp, queryStrategy, etc.)' })
  @IsOptional()
  @IsObject()
  dnsConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateDnsConfigDto extends PartialType(CreateDnsConfigDto) {}
