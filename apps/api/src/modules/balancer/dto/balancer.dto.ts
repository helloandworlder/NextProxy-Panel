import { IsString, IsOptional, IsObject, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBalancerDto {
  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiProperty()
  @IsString()
  tag: string;

  @ApiPropertyOptional({ description: 'Xray balancer config (selector, strategy, fallbackTag)' })
  @IsOptional()
  @IsObject()
  balancerConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateBalancerDto extends PartialType(CreateBalancerDto) {}
