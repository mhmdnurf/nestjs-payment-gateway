import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: '9d5f3d...',
    description: 'Email verification token',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class VerifyEmailResponseDto {
  @ApiProperty({
    example: 'Email verified successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
