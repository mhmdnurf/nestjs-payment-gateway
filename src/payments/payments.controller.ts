import {
  Body,
  Controller,
  Headers,
  Post,
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
import {
  XenditInvoiceWebhookDto,
  XenditWebhookResponseDto,
} from './dto/xendit-invoice-webhook.dto';

@Controller('payments')
export class PaymentsController {
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
    @Body() dto: XenditInvoiceWebhookDto,
  ): Promise<XenditWebhookResponseDto> {
    return this.paymentsService.handleXenditInvoiceWebhook(callbackToken, dto);
  }
}
