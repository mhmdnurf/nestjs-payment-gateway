import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address for the account',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If the account exists, a password reset link has been sent',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
