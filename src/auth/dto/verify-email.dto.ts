import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class VerifyEmailResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
