import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    example: 'afc9f75b6f0b4d6d...',
    description: 'Refresh token for the session to revoke',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logged out successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
