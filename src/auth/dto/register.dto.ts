import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(5)
  username!: string;
}

export class RegisterResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  username!: string;
  role!: string;
  createdAt!: Date;
}
