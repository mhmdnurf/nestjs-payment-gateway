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
import {
  ListWalletTransactionsDto,
  ListWalletTransactionsResponseDto,
} from './dto/list-wallet-transaction.dto';
import { TransferDto, TransferResponseDto } from './dto/transfer.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { WalletTransactionType } from 'src/generated/prisma/enums';

type AccessTokenPayload = { sub: string };

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get the current user wallet' })
  @ApiOkResponse({
    description: 'Current user wallet returned',
    type: MeWalletResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
  })
  async me(
    @Req() req: Request & { user?: AccessTokenPayload },
  ): Promise<MeWalletResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.walletsService.me(req.user.sub);
  }

  @UseGuards(JwtAccessGuard)
  @Get('me/transactions')
  @ApiOperation({ summary: 'List current user wallet transactions' })
  @ApiOkResponse({
    description: 'Wallet transactions returned',
    type: ListWalletTransactionsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Items per page, maximum 100',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: WalletTransactionType,
    description: 'Filter by transaction type',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found',
  })
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
  @ApiOperation({ summary: 'Transfer funds to another wallet' })
  @ApiOkResponse({
    description: 'Transfer completed successfully',
    type: TransferResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed, insufficient balance, same-wallet transfer, or currency mismatch',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'Sender or recipient wallet not found',
  })
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
