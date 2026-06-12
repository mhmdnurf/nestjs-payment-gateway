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

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('wallet-top-ups')
  @UseGuards(JwtAccessGuard)
  async createWalletTopUp(
    @Req() req: Request & { user?: { sub: string } },
    @Body() dto: CreateWalletTopUpDto,
  ): Promise<CreateWalletTopUpResponseDto> {
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid access token payload');
    }
    return this.paymentsService.createWalletTopUp(req.user.sub, dto);
  }

  @Post('webhooks/xendit')
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
