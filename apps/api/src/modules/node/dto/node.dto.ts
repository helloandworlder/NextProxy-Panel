import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

/**
 * Quick create node DTO - minimal fields for fast registration
 */
export class QuickCreateNodeDto {
  @ApiProperty({ example: 'US-Node-01', description: 'Node name (only required field)' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Optional node group ID' })
  @IsOptional()
  @IsString()
  nodeGroupId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateNodeDto {
  @ApiProperty({ example: 'US-Node-01' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nodeGroupId?: string;

  @ApiProperty({ example: 'US' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ example: 'United States' })
  @IsOptional()
  @IsString()
  countryName?: string;

  @ApiProperty({ example: 'Los Angeles' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Cloudflare' })
  @IsOptional()
  @IsString()
  isp?: string;

  @ApiProperty({ required: false, example: ['premium', 'streaming'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateNodeDto extends PartialType(CreateNodeDto) {
  @ApiProperty({ required: false, enum: ['online', 'offline', 'maintenance'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  configOverrides?: Record<string, any>;
}
