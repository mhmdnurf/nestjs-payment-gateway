import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { MeWalletResponseDto } from './dto/me-wallet.dto';
import { TopUpDto, TopUpResponseDto } from './dto/top-up.dto';
import {
  ListWalletTransactionsDto,
  ListWalletTransactionsResponseDto,
} from './dto/list-wallet-transaction.dto';
import { TransferDto, TransferResponseDto } from './dto/transfer.dto';
import { Prisma } from 'src/generated/prisma/client';
import { generateReference } from 'src/common/utils/reference.util';

const MAX_RETRIES = 3;

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

  async meTransactions(
    userId: string,
    query: ListWalletTransactionsDto,
  ): Promise<ListWalletTransactionsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const where = {
      walletId: wallet.id,
      ...(query.type ? { type: query.type } : {}),
    };

    const [transactions, totalItems] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          reference: true,
          createdAt: true,
        },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      items: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: item.amount.toString(),
        balanceAfter: item.balanceAfter.toString(),
        description: item.description,
        reference: item.reference,
        createdAt: item.createdAt,
      })),

      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
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
      const reference = generateReference('TOPUP');

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
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
          balanceAfter: updatedWallet.balance,
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

  async transfer(
    senderUserId: string,
    dto: TransferDto,
  ): Promise<TransferResponseDto> {
    const recipientUsername = dto.recipientUsername.trim().toLowerCase();
    const amount = new Prisma.Decimal(dto.amount);

    const result = await this.runSerializableTransaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId: senderUserId,
        },
        select: {
          id: true,
          userId: true,
          balance: true,
          currency: true,
        },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      const recipientUser = await tx.user.findUnique({
        where: { username: recipientUsername },
        select: {
          id: true,
          username: true,
          wallet: {
            select: {
              id: true,
              userId: true,
              balance: true,
              currency: true,
            },
          },
        },
      });

      if (!recipientUser?.wallet) {
        throw new NotFoundException('Recipient wallet not found');
      }

      if (recipientUser.id === senderUserId) {
        throw new BadRequestException('Cannot transfer to your own wallet');
      }

      if (senderWallet.currency !== recipientUser.wallet.currency) {
        throw new BadRequestException('Wallet currency mismatch');
      }

      const senderDebit = await tx.wallet.updateMany({
        where: {
          id: senderWallet.id,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
      });

      if (senderDebit.count === 0) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const reference = generateReference('TRF');

      const updatedSenderWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: senderWallet.id },
        select: {
          id: true,
          balance: true,
        },
      });

      const updatedRecipientWallet = await tx.wallet.update({
        where: {
          id: recipientUser.wallet.id,
        },
        data: {
          balance: { increment: amount },
        },
        select: {
          id: true,
          balance: true,
        },
      });

      const transferOut = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'TRANSFER_OUT',
          amount,
          balanceAfter: updatedSenderWallet.balance,
          description: dto.description?.trim() || null,
          reference,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      const transferIn = await tx.walletTransaction.create({
        data: {
          walletId: recipientUser.wallet.id,
          type: 'TRANSFER_IN',
          amount,
          balanceAfter: updatedRecipientWallet.balance,
          description: dto.description?.trim() || null,
          reference,
        },
        select: {
          id: true,
        },
      });

      return {
        reference,
        senderWallet: updatedSenderWallet,
        recipientWallet: updatedRecipientWallet,
        recipientUsername: recipientUser.username,
        transferOut,
        transferIn,
      };
    });

    return {
      reference: result.reference,
      senderWalletId: result.senderWallet.id,
      senderBalance: result.senderWallet.balance.toString(),
      recipientWalletId: result.recipientWallet.id,
      recipientUsername: result.recipientUsername,
      recipientBalance: result.recipientWallet.balance.toString(),
      amount: amount.toString(),
      description: dto.description?.trim() || null,
      transferOutTransactionId: result.transferOut.id,
      transferInTransactionId: result.transferIn.id,
      createdAt: result.transferOut.createdAt,
    };
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private async runSerializableTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        const isRetryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';

        if (isRetryable && attempt < MAX_RETRIES) {
          await this.sleep(25 * attempt);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Transaction retry loop exhausted');
  }
}
