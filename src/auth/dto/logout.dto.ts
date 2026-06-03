import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
