import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/refresh-token.dto';
import type { Request } from 'express';
import { VerifyEmailDto, VerifyEmailResponseDto } from './dto/verify-email.dto';
import {
  ResendVerificationDto,
  ResendVerificationResponseDto,
} from './dto/resend-verification.dto';
import { LogoutDto, LogoutResponseDto } from './dto/logout.dto';
import { LogoutAllDto, LogoutAllResponseDto } from './dto/logout-all.dto';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from './dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(@Body() data: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(data);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() data: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(data);
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() data: ResendVerificationDto,
  ): Promise<ResendVerificationResponseDto> {
    return this.authService.resendVerification(data);
  }

  @Post('login')
  async login(
    @Body() data: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
    const userAgent = req.get('user-agent') ?? null;
    return this.authService.login(data, {
      userAgent,
      ipAddress: ip?.trim() ? ip : null,
    });
  }

  @Post('refresh')
  async refresh(
    @Body() data: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(data);
  }

  @Post('logout')
  async logout(@Body() data: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(data);
  }

  @Post('logout-all')
  async logoutAll(@Body() data: LogoutAllDto): Promise<LogoutAllResponseDto> {
    return this.authService.logoutAll(data);
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() data: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  async resetPassword(
    @Body() data: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(data);
  }
}
