import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateNodeGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Group type: residential_socks5, relay, custom' })
  @IsOptional()
  @IsString()
  groupType?: string;

  @ApiPropertyOptional({ description: 'Schema fields for node metadata' })
  @IsOptional()
  @IsArray()
  schemaFields?: Array<{ name: string; type: string; required: boolean; options?: string[] }>;

  @ApiPropertyOptional({ description: 'Required tags for nodes in this group' })
  @IsOptional()
  @IsArray()
  requiredTags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lbStrategy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  lbSettings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  healthCheck?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateNodeGroupDto extends PartialType(CreateNodeGroupDto) {}
