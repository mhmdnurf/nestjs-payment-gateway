import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import {
  RefreshTokenDto,
  RefreshTokenResponseDto,
} from './dto/refresh-token.dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(@Body() data: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(data);
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
}
