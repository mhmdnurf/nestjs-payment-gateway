import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { MeResponseDto } from 'src/auth/dto/me.dto';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import { UpdateMeDto } from 'src/auth/dto/update-me.dto';

type AccessTokenPayload = { sub: string };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(
    @Req() req: Request & { user?: AccessTokenPayload },
  ): Promise<MeResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.usersService.me(req.user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Patch('me')
  async updateMe(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Body() dto: UpdateMeDto,
  ): Promise<MeResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.usersService.updateMe(req.user.sub, dto);
  }
}
