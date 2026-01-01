import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDnsProviderDto {
  @ApiProperty({ description: 'Provider display name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['cloudflare', 'aliyun', 'tencent', 'dnspod'] })
  @IsEnum(['cloudflare', 'aliyun', 'tencent', 'dnspod'])
  provider: string;

  @ApiProperty({ description: 'Root domain, e.g., gosea.in' })
  @IsString()
  rootDomain: string;

  @ApiPropertyOptional({ description: 'Zone ID (required for Cloudflare)' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ description: 'API credentials' })
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    apiToken?: string;
    accountId?: string;
  };

  @ApiPropertyOptional({ description: 'Domain pattern template' })
  @IsOptional()
  @IsString()
  domainPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateDnsProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    apiToken?: string;
    accountId?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domainPattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class CreateDnsRecordDto {
  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiProperty({ enum: ['A', 'AAAA', 'CNAME'] })
  @IsEnum(['A', 'AAAA', 'CNAME'])
  recordType: string;

  @ApiProperty({ description: 'Full domain name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'IP or CNAME target' })
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proxied?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  ttl?: number;
}

export class UpdateDnsRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proxied?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  ttl?: number;
}
