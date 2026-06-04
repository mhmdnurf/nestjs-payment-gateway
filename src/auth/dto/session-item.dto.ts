import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SessionItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @IsString()
  userAgent!: string | null;

  @IsOptional()
  @IsString()
  ipAddress!: string | null;

  @IsString()
  @IsNotEmpty()
  lastSeenAt!: string;

  @IsString()
  @IsNotEmpty()
  expiresAt!: string;

  @IsBoolean()
  isCurrent!: boolean;
}

export class ListSessionsResponseDto {
  sessions!: SessionItemDto[];
}
