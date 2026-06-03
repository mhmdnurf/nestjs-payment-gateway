import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}

export class ForgotPasswordResponseDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}
