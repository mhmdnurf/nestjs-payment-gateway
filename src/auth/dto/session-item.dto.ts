import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SessionItemDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    example:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  userAgent!: string | null;

  @ApiProperty({
    example: '127.0.0.1',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  ipAddress!: string | null;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  lastSeenAt!: string;

  @ApiProperty({
    example: '2026-06-24T10:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  expiresAt!: string;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  isCurrent!: boolean;
}

export class ListSessionsResponseDto {
  @ApiProperty({
    type: [SessionItemDto],
  })
  sessions!: SessionItemDto[];
}
