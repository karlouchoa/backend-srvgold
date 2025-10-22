import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SyncRecordsDto {
  @IsString()
  @IsNotEmpty()
  readonly idempotency_key: string;

  @IsArray()
  @ArrayNotEmpty()
  readonly records: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  readonly source?: string;

  @IsOptional()
  @IsString()
  readonly cursor?: string;
}
