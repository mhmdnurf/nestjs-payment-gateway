import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

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
