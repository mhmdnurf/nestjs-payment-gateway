import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'mhd.zaka12@gmail.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 8,
    description: 'User password',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    example: 'Muhammad Nurfatkhur Rahman',
    description: 'Display name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'mhmdnurf',
    minLength: 5,
    description: 'Unique username',
  })
  @IsString()
  @MinLength(5)
  username!: string;
}

export class RegisterResponseDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  id!: string;
  @ApiProperty({
    example: 'mhd.zaka12@gmail.com',
  })
  email!: string;
  @ApiProperty({
    example: 'Muhammad Nurfatkhur Rahman',
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
  @ApiProperty({
    example: '2025-06-17T10:00:00.000Z',
  })
  createdAt!: Date;
}
