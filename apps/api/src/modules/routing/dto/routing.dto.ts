import { IsString, IsInt, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateRoutingRuleDto {
  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty({ example: 'block-ads' })
  @IsString()
  ruleTag: string;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiProperty({ description: 'Xray routing rule config (JSONB passthrough)' })
  @IsObject()
  ruleConfig: Record<string, any>;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateRoutingRuleDto extends PartialType(CreateRoutingRuleDto) {}
