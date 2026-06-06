import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { MeWalletResponseDto } from './dto/me-wallet.dto';
import { TopUpDto, TopUpResponseDto } from './dto/top-up.dto';
import { Prisma } from 'src/generated/prisma/browser';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<MeWalletResponseDto> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      id: wallet.id,
      balance: wallet.balance.toString(),
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async topUp(userId: string, dto: TopUpDto): Promise<TopUpResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const amount = new Prisma.Decimal(dto.amount);
      const newBalance = wallet.balance.add(amount);
      const reference = `TOP_UP-${Date.now()}-${wallet.id}`;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
        },
        select: {
          id: true,
          balance: true,
          currency: true,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'TOP_UP',
          amount,
          balanceAfter: newBalance,
          description: dto.description?.trim() || null,
          reference,
        },
        select: {
          id: true,
          walletId: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          reference: true,
          createdAt: true,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    return {
      walletId: result.wallet.id,
      balance: result.wallet.balance.toString(),
      currency: result.wallet.currency,
      transactionId: result.transaction.id,
      transactionType: result.transaction.type,
      amount: result.transaction.amount.toString(),
      balanceAfter: result.transaction.balanceAfter.toString(),
      description: result.transaction.description,
      reference: result.transaction.reference,
      createdAt: result.transaction.createdAt,
    };
  }
}
