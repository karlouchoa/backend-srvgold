import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  readonly currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  readonly newPassword: string;
}
