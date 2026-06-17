import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutAllDto {
  @ApiProperty({
    example: 'afc9f75b6f0b4d6d...',
    description: 'Refresh token from one of the user sessions',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutAllResponseDto {
  @ApiProperty({
    example: 'Logged out from all sessions successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
