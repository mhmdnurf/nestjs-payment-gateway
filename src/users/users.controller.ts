import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { MeResponseDto } from 'src/auth/dto/me.dto';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';

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
}
