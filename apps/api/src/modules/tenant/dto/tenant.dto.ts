import { IsString, IsOptional, IsInt, IsObject, Min, IsArray, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'My Company' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-company' })
  @IsString()
  slug: string;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxNodes?: number;

  @ApiProperty({ required: false, default: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxClients?: number;

  @ApiProperty({ required: false, default: 0, description: '0 = unlimited' })
  @IsOptional()
  maxTrafficBytes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiProperty({ required: false, enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateTenantUserDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ required: false, example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, enum: ['admin', 'operator', 'readonly'], default: 'operator' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false, example: ['nodes:*', 'clients:read'] })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enable?: boolean;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: ['*'], default: ['*'] })
  @IsOptional()
  @IsArray()
  scopes?: string[];

  @ApiProperty({ required: false, default: 1000, description: 'Requests per minute' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiProperty({ required: false, example: ['192.168.1.1'] })
  @IsOptional()
  @IsArray()
  allowedIps?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
