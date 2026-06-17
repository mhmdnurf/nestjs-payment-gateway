import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeSessionDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
    description: 'Session id to revoke',
  })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

export class RevokeSessionResponseDto {
  @ApiProperty({
    example: 'Session revoked successfully',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
