import { IsString, IsEmail, IsOptional, MinLength, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateSystemAdminDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

export class UpdateSystemAdminDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}

export class SystemAdminLoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  ip?: string;
}

// Tenant Management DTOs
export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsNumber()
  @IsOptional()
  maxNodes?: number;

  @IsNumber()
  @IsOptional()
  maxClients?: number;

  @IsOptional()
  settings?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  maxNodes?: number;

  @IsNumber()
  @IsOptional()
  maxClients?: number;

  @IsOptional()
  settings?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  expiresAt?: string;
}

// User Management DTOs
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  enable?: boolean;
}

export class AssignTenantDto {
  @IsString()
  tenantId: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsArray()
  @IsOptional()
  permissions?: string[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

// System Settings DTOs
export class UpdateSystemSettingDto {
  value: unknown;
}

export class ValidateReleaseDto {
  @IsString()
  repo: string;

  @IsString()
  @IsOptional()
  release?: string;
}
