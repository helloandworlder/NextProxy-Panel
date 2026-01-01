import { IsOptional, IsObject, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePolicyConfigDto {
  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiPropertyOptional({ description: 'Xray Policy config (levels, system)' })
  @IsOptional()
  @IsObject()
  policyConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class UpdatePolicyConfigDto extends PartialType(CreatePolicyConfigDto) {}
