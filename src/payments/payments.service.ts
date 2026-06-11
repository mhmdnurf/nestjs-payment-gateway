import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { XenditService } from './xendit/xendit.service';
import {
  CreateWalletTopUpDto,
  CreateWalletTopUpResponseDto,
} from './dto/create-wallet-top-up.dto';
import { Prisma } from 'src/generated/prisma/client';
import { generateReference } from 'src/common/utils/reference.util';
import {
  XenditInvoiceWebhookDto,
  XenditWebhookResponseDto,
} from './dto/xendit-invoice-webhook.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xenditService: XenditService,
  ) {}

  async createWalletTopUp(
    userId: string,
    dto: CreateWalletTopUpDto,
  ): Promise<CreateWalletTopUpResponseDto> {
    const amount = new Prisma.Decimal(dto.amount);
    const reference = generateReference('WTU');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const topUp = await this.prisma.walletTopUp.create({
      data: {
        userId,
        amount,
        currency: 'IDR',
        reference,
        status: 'PENDING',
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        status: true,
      },
    });

    const invoice = await this.xenditService.createInvoice({
      externalId: topUp.reference,
      amount: dto.amount,
      payerEmail: user.email,
      description: `Wallet top up ${topUp.reference}`,
      currency: 'IDR',
    });

    const updatedTopUp = await this.prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: {
        xenditInvoiceId: invoice.id,
        xenditInvoiceUrl: invoice.invoiceUrl,
        expiredAt: invoice.expiryDate ? new Date(invoice.expiryDate) : null,
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        status: true,
        xenditInvoiceUrl: true,
      },
    });

    return {
      id: updatedTopUp.id,
      reference: updatedTopUp.reference,
      status: updatedTopUp.status,
      amount: updatedTopUp.amount.toString(),
      currency: updatedTopUp.currency,
      invoiceUrl: updatedTopUp.xenditInvoiceUrl!,
    };
  }

  async handleXenditInvoiceWebhook(
    callbackToken: string | undefined,
    dto: XenditInvoiceWebhookDto,
  ): Promise<XenditWebhookResponseDto> {
    this.xenditService.verifyCallbackToken(callbackToken);

    const status = dto.status.toUpperCase();

    if (status === 'PAID' || status === 'SETTLED') {
      const credited = await this.creditPaidWalletTopUp(dto);

      return {
        received: true,
        credited,
        status: 'PAID',
      };
    }

    if (status === 'EXPIRED') {
      await this.markWalletTopUpStatus(dto.external_id, 'EXPIRED');

      return {
        received: true,
        credited: false,
        status: 'EXPIRED',
      };
    }

    if (status === 'FAILED') {
      await this.markWalletTopUpStatus(dto.external_id, 'FAILED');

      return {
        received: true,
        credited: false,
        status: 'FAILED',
      };
    }

    return {
      received: true,
      credited: false,
      status,
    };
  }

  private async creditPaidWalletTopUp(
    dto: XenditInvoiceWebhookDto,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const topUp = await tx.walletTopUp.findUnique({
        where: { reference: dto.external_id },
        select: {
          id: true,
          userId: true,
          amount: true,
          currency: true,
          status: true,
          reference: true,
        },
      });

      if (!topUp) {
        throw new NotFoundException('Wallet top-up not found');
      }

      if (topUp.status === 'PAID') {
        return false;
      }

      if (topUp.status !== 'PENDING') {
        throw new BadRequestException('Wallet top-up is not payable');
      }

      const paidTopUp = await tx.walletTopUp.updateMany({
        where: {
          id: topUp.id,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          xenditInvoiceId: dto.id,
          paidAt: dto.paid_at ? new Date(dto.paid_at) : new Date(),
        },
      });

      if (paidTopUp.count === 0) {
        return false;
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId: topUp.userId },
        data: {
          balance: {
            increment: topUp.amount,
          },
        },
        select: {
          id: true,
          balance: true,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: 'TOP_UP',
          amount: topUp.amount,
          balanceAfter: updatedWallet.balance,
          description: `Xendit wallet top-up ${topUp.reference}`,
          reference: topUp.reference,
        },
      });

      return true;
    });
  }

  private async markWalletTopUpStatus(
    reference: string,
    status: 'EXPIRED' | 'FAILED',
  ): Promise<void> {
    await this.prisma.walletTopUp.updateMany({
      where: {
        reference,
        status: 'PENDING',
      },
      data: { status },
    });
  }
}
