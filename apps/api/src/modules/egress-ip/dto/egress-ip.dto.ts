import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IpType {
  DATACENTER = 'datacenter',
  RESIDENTIAL = 'residential',
  MOBILE = 'mobile',
}

export class QueryEgressIpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: IpType })
  @IsOptional()
  @IsEnum(IpType)
  ipType?: IpType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryAvailableEgressIpDto extends QueryEgressIpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isp?: string;
}

export class CreateEgressIpDto {
  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty()
  @IsString()
  ip: string;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @IsInt()
  ipVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interfaceName?: string;

  @ApiPropertyOptional({ enum: IpType, default: IpType.DATACENTER })
  @IsOptional()
  @IsEnum(IpType)
  ipType?: IpType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asn?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, description: '0 = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;
}

export class UpdateEgressIpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interfaceName?: string;

  @ApiPropertyOptional({ enum: IpType })
  @IsOptional()
  @IsEnum(IpType)
  ipType?: IpType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '0 = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;
}
