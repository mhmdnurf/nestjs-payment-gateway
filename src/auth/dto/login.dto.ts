import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

class LoginUserResponseDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'Muhammad Nurfatkhur Rahman',
    nullable: true,
  })
  name!: string | null;

  @ApiProperty({
    example: 'mhmdnurf',
  })
  username!: string;

  @ApiProperty({
    example: 'USER',
  })
  role!: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'mhmdnurf',
    description: 'Username for the account',
  })
  @IsString()
  username!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 8,
    description: 'Account password',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'afc9f75b6f0b4d6d...',
  })
  refreshToken!: string;

  @ApiProperty({
    example: 'Bearer',
  })
  tokenType!: 'Bearer';

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime in seconds',
  })
  expiresIn!: number;

  @ApiProperty({
    type: LoginUserResponseDto,
  })
  user!: {
    id: string;
    email: string;
    name: string | null;
    username: string;
    role: string;
  };
}
