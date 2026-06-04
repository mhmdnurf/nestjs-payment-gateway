import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

export class RevokeSessionResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
