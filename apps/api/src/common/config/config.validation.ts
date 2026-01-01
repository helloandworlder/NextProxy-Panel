import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, MinLength, IsOptional, IsNumber, Min, Max, validateSync } from 'class-validator';

/**
 * Environment configuration validation
 * Ensures all required security-critical configs are properly set
 */
export class EnvironmentVariables {
  // Database
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL: string;

  // Redis
  @IsString()
  @IsNotEmpty({ message: 'REDIS_URL is required' })
  REDIS_URL: string;

  // JWT Security - CRITICAL
  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required for security' })
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters for security' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '7d';

  // API Configuration
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  API_PORT?: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX?: string = 'api/v1';

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  // Logging
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @IsString()
  @IsOptional()
  NODE_ENV?: string = 'development';
}

/**
 * Validate environment variables at startup
 * Throws error if critical configs are missing or invalid
 */
export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('\n');
    throw new Error(`Configuration validation failed:\n${errorMessages}`);
  }

  // Additional security checks
  if (validatedConfig.JWT_SECRET === 'your-jwt-secret-change-in-production') {
    throw new Error('SECURITY ERROR: JWT_SECRET must be changed from default value!');
  }

  if (validatedConfig.JWT_SECRET.length < 32) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be at least 32 characters!');
  }

  return validatedConfig;
}
