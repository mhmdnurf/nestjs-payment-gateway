import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import {
  CreateWalletTopUpDto,
  CreateWalletTopUpResponseDto,
} from './dto/create-wallet-top-up.dto';
import { PaymentsService } from './payments.service';
import { XenditWebhookResponseDto } from './dto/xendit-invoice-webhook.dto';
import {
  ListWalletTopUpsDto,
  ListWalletTopUpsResponseDto,
} from './dto/list-wallet-top-ups.dto';
import { WalletTopUpItemDto } from './dto/wallet-top-up-item.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaymentStatus } from 'src/generated/prisma/enums';
import { XenditInvoiceWebhookDto } from './dto/xendit-invoice-webhook.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('wallet-top-ups')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a wallet top-up invoice' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Optional idempotency key for retrying top-up creation',
  })
  @ApiCreatedResponse({
    description: 'Wallet top-up invoice created',
    type: CreateWalletTopUpResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async createWalletTopUp(
    @Req() req: Request & { user?: { sub: string } },
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateWalletTopUpDto,
  ): Promise<CreateWalletTopUpResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.paymentsService.createWalletTopUp(
      req.user.sub,
      dto,
      idempotencyKey,
    );
  }

  @Post('webhooks/xendit')
  @ApiOperation({ summary: 'Handle Xendit invoice webhook' })
  @ApiHeader({
    name: 'x-callback-token',
    required: true,
    description: 'Xendit callback verification token',
  })
  @ApiBody({
    type: XenditInvoiceWebhookDto,
  })
  @ApiOkResponse({
    description: 'Webhook processed',
    type: XenditWebhookResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid webhook payload or payment mismatch',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid callback token',
  })
  @ApiNotFoundResponse({
    description: 'Wallet top-up not found',
  })
  async handleXenditWebhook(
    @Headers('x-callback-token') callbackToken: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<XenditWebhookResponseDto> {
    try {
      const result = await this.paymentsService.handleXenditInvoiceWebhook(
        callbackToken,
        body,
      );

      this.logger.log(
        `Xendit webhook processed: external_id=${String(body.external_id)}, status=${String(body.status)}, credited=${String(result.credited)}`,
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Xendit webhook failed: external_id=${String(body.external_id)}, status=${String(body.status)}, message=${message}`,
        stack,
      );
      throw error;
    }
  }

  @Get('wallet-top-ups')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user wallet top-ups' })
  @ApiOkResponse({
    description: 'Wallet top-ups returned',
    type: ListWalletTopUpsResponseDto,
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
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by top-up status',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  async listWalletTopUps(
    @Req() req: Request & { user?: { sub: string } },
    @Query() query: ListWalletTopUpsDto,
  ): Promise<ListWalletTopUpsResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.paymentsService.listWalletTopUps(req.user.sub, query);
  }

  @Get('wallet-top-ups/:id')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one current user wallet top-up' })
  @ApiOkResponse({
    description: 'Wallet top-up returned',
    type: WalletTopUpItemDto,
  })
  @ApiParam({
    name: 'id',
    example: 'cmq3topup0000or0s7df18ia0',
    description: 'Wallet top-up id',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token',
  })
  @ApiNotFoundResponse({
    description: 'Wallet top-up not found',
  })
  async getWalletTopUp(
    @Req() req: Request & { user?: { sub: string } },
    @Param('id') id: string,
  ): Promise<WalletTopUpItemDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return this.paymentsService.getWalletTopUp(req.user.sub, id);
  }
}
