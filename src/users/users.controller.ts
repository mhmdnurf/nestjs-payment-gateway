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
import { MeResponseDto } from 'src/users/dto/me.dto';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import { UpdateMeDto } from 'src/users/dto/update-me.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type AccessTokenPayload = { sub: string };

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({
    description: 'Current user profile returned',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiForbiddenResponse({
    description: 'Account is inactive',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
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
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({
    description: 'Current user profile updated',
    type: MeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiForbiddenResponse({
    description: 'Account is inactive',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiConflictResponse({
    description: 'Username already in use',
  })
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
