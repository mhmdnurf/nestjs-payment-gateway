import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { XenditService } from './xendit/xendit.service';
import {
  CreateWalletTopUpDto,
  CreateWalletTopUpResponseDto,
} from './dto/create-wallet-top-up.dto';
import { Prisma } from 'src/generated/prisma/client';
import { generateReference } from 'src/common/utils/reference.util';

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
}
