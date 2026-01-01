import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConfigVersionDto {
  @IsUUID()
  nodeId: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class RollbackConfigDto {
  @IsUUID()
  versionId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
