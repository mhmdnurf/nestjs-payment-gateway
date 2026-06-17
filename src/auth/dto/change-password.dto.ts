import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'password123',
    description: 'Current account password',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

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

export class ChangePasswordResponseDto {
  @ApiProperty({
    example: 'password changed successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
