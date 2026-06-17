import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: '9d5f3d...',
    description: 'Password reset token from email',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({
    example: 'newPassword123',
    minLength: 8,
    description: 'New account password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({
    example: 'Password has been reset successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
