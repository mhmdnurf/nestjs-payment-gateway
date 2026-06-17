import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
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
import { JwtAccessGuard } from './guards/jwt-access.guard';
import {
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from './dto/change-password.dto';
import { ListSessionsResponseDto } from './dto/session-item.dto';
import { RevokeSessionResponseDto } from './dto/revoke-session.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type AccessTokenPayload = { sub: string; sessionId: string };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiConflictResponse({
    description: 'Email or username already registered',
  })
  async registerUser(@Body() data: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(data);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify a user email address' })
  @ApiOkResponse({
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, used, or expired verification token',
  })
  @ApiConflictResponse({
    description: 'Email already verified',
  })
  async verifyEmail(
    @Body() data: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return this.authService.verifyEmail(data);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend email verification instructions' })
  @ApiOkResponse({
    description: 'Verification email request processed',
    type: ResendVerificationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  async resendVerification(
    @Body() data: ResendVerificationDto,
  ): Promise<ResendVerificationResponseDto> {
    return this.authService.resendVerification(data);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in and create a session' })
  @ApiOkResponse({
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiForbiddenResponse({
    description: 'Account temporarily locked',
  })
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Rotate a refresh token and issue a new access token',
  })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token',
  })
  @ApiForbiddenResponse({
    description: 'Account is inactive',
  })
  async refresh(
    @Body() data: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(data);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out the session for a refresh token' })
  @ApiOkResponse({
    description: 'Logout request processed',
    type: LogoutResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  async logout(@Body() data: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(data);
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Log out all sessions for a user' })
  @ApiOkResponse({
    description: 'Logout all request processed',
    type: LogoutAllResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  async logoutAll(@Body() data: LogoutAllDto): Promise<LogoutAllResponseDto> {
    return this.authService.logoutAll(data);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({
    description: 'Password reset request processed',
    type: ForgotPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  async forgotPassword(
    @Body() data: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset a password using a reset token' })
  @ApiOkResponse({
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid, used, or expired password reset token',
  })
  async resetPassword(
    @Body() data: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(data);
  }

  @UseGuards(JwtAccessGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiOkResponse({
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or incorrect credentials',
  })
  @ApiConflictResponse({
    description: 'New password matches the current password',
  })
  async changePassword(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Body() data: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.authService.changePassword(
      req.user.sub,
      req.user.sessionId,
      data,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiOkResponse({
    description: 'Active sessions returned',
    type: ListSessionsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  async listSessions(
    @Req() req: Request & { user?: AccessTokenPayload },
  ): Promise<ListSessionsResponseDto> {
    if (!req.user?.sub || !req.user.sessionId) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.authService.listSessions(req.user.sub, req.user.sessionId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke one active session' })
  @ApiOkResponse({
    description: 'Session revoked successfully',
    type: RevokeSessionResponseDto,
  })
  @ApiParam({
    name: 'sessionId',
    example: 'cmq3lkcoo0000or0s7df18ia0',
    description: 'Session id to revoke',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'Session not found',
  })
  async revokeSession(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Param('sessionId') sessionId: string,
  ): Promise<RevokeSessionResponseDto> {
    if (!req.user?.sub || !req.user.sessionId) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.authService.revokeSession(
      req.user.sub,
      req.user.sessionId,
      sessionId,
    );
  }
}
