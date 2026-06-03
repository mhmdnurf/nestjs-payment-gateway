import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutAllDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutAllResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
