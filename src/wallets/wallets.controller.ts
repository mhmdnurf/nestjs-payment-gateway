import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import { Request } from 'express';
import { MeWalletResponseDto } from './dto/me-wallet.dto';
import { TopUpDto, TopUpResponseDto } from './dto/top-up.dto';
import {
  ListWalletTransactionsDto,
  ListWalletTransactionsResponseDto,
} from './dto/list-wallet-transaction.dto';
import { TransferDto, TransferResponseDto } from './dto/transfer.dto';

type AccessTokenPayload = { sub: string };

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(
    @Req() req: Request & { user?: AccessTokenPayload },
  ): Promise<MeWalletResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.walletsService.me(req.user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Post('top-up')
  async topUp(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Body() dto: TopUpDto,
  ): Promise<TopUpResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.walletsService.topUp(req.user.sub, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me/transactions')
  async meTransactions(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Query() query: ListWalletTransactionsDto,
  ): Promise<ListWalletTransactionsResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.walletsService.meTransactions(req.user.sub, query);
  }

  @UseGuards(JwtAccessGuard)
  @Post('transfer')
  async transfer(
    @Req() req: Request & { user?: AccessTokenPayload },
    @Body() dto: TransferDto,
  ): Promise<TransferResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.walletsService.transfer(req.user.sub, dto);
  }
}
