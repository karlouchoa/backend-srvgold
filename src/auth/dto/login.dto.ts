import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  readonly login: string;

  @IsString()
  @MinLength(6)
  readonly password: string;
}
