import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  ip?: string;
}

export class SwitchTenantDto {
  @ApiProperty({ example: 'uuid-of-tenant' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
