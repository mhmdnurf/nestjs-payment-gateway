import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: number;
  user!: {
    id: string;
    email: string;
    name: string | null;
    username: string;
    role: string;
  };
}
