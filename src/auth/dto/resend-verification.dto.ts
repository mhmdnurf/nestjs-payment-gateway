import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address for the account',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ResendVerificationResponseDto {
  @ApiProperty({
    example:
      'If the account exists and is not yet verified, a verification email has been sent.',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
