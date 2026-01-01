import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================
// Search Instances DTO
// ============================================

export class SearchInstancesDto {
  @ApiPropertyOptional({ description: 'Instance status: 0=creating, 1=active, 2=expired, 3=disabled' })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: 'Proxy IDs to search' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proxyIds?: string[];

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-3)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'City code' })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiPropertyOptional({ description: 'ISP type: 0=none, 1=broadcast, 2=native' })
  @IsOptional()
  @IsNumber()
  ispType?: number;

  @ApiPropertyOptional({ description: 'Order number' })
  @IsOptional()
  @IsString()
  orderNo?: string;

  @ApiPropertyOptional({ description: 'IP address (fuzzy search)' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'Only query instances expiring within 7 days' })
  @IsOptional()
  @IsBoolean()
  expiringSoon?: boolean;

  @ApiPropertyOptional({ description: 'Current page (0-based)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number;
}

// ============================================
// Batch Change IP DTO
// ============================================

export class BatchChangeIpDto {
  @ApiProperty({ description: 'Proxy IDs to change IP (1-100)' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  proxyIds: string[];

  @ApiPropertyOptional({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string;
}

// ============================================
// Batch Renew DTO
// ============================================

export class BatchRenewDto {
  @ApiProperty({ description: 'Proxy IDs to renew' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  proxyIds: string[];

  @ApiProperty({ description: 'Renewal days (must be > 0)' })
  @IsNumber()
  @Min(1)
  days: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: 'External order number' })
  @IsOptional()
  @IsString()
  orderNo?: string;
}

// ============================================
// Batch Update Credentials DTO
// ============================================

export class BatchUpdateCredentialsDto {
  @ApiProperty({ description: 'Proxy IDs to update (1-100)' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  proxyIds: string[];

  @ApiPropertyOptional({ description: 'New username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Generate random credentials' })
  @IsOptional()
  @IsBoolean()
  random?: boolean;

  @ApiPropertyOptional({ description: 'Remark' })
  @IsOptional()
  @IsString()
  remark?: string;
}

// ============================================
// Search Lines DTO
// ============================================

export class SearchLinesDto {
  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-3)' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'City code' })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiPropertyOptional({ description: 'Business type code' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ description: 'Tag code' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'ISP type: 0=none, 1=broadcast, 2=native' })
  @IsOptional()
  @IsNumber()
  ispType?: number;

  @ApiPropertyOptional({ description: 'Line ID' })
  @IsOptional()
  @IsString()
  lineId?: string;

  @ApiPropertyOptional({ description: 'Current page (0-based)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number;
}
