import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;

  const tx = {
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
  };

  const prisma = {
    wallet: {
      findUnique: jest.fn(),
    },
    walletTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(async (callback) => {
      return callback(tx);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns current wallet', async () => {
    const createdAt = new Date();
    const updatedAt = new Date();

    prisma.wallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      balance: new Prisma.Decimal(10000),
      currency: 'IDR',
      createdAt,
      updatedAt,
    });

    const result = await service.me('user-1');

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: {
        id: true,
        balance: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    expect(result).toEqual({
      id: 'wallet-1',
      balance: '10000',
      currency: 'IDR',
      createdAt,
      updatedAt,
    });
  });

  it('throws NotFoundException when wallet does not exist', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);
    await expect(service.me('user-1')).rejects.toThrow(NotFoundException);
  });

  it('tops up wallet and creates a TOP_UP transaction', async () => {
    const createdAt = new Date();

    tx.wallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      balance: new Prisma.Decimal(10000),
      currency: 'IDR',
    });

    tx.wallet.update.mockResolvedValue({
      id: 'wallet-1',
      balance: new Prisma.Decimal(15000),
      currency: 'IDR',
    });

    tx.walletTransaction.create.mockResolvedValue({
      id: 'tx-1',
      walletId: 'wallet-1',
      type: 'TOP_UP',
      amount: new Prisma.Decimal(5000),
      balanceAfter: new Prisma.Decimal(15000),
      description: 'deposit',
      reference: 'TOPUP-20260611-ABC123',
      createdAt,
    });

    const result = await service.topUp('user-1', {
      amount: 5000,
      description: 'deposit',
    });

    expect(tx.wallet.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: {
        id: true,
        balance: true,
        currency: true,
      },
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: {
        balance: { increment: new Prisma.Decimal(5000) },
      },
      select: {
        id: true,
        balance: true,
        currency: true,
      },
    });

    expect(tx.walletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'wallet-1',
          type: 'TOP_UP',
          amount: new Prisma.Decimal(5000),
          balanceAfter: new Prisma.Decimal(15000),
          description: 'deposit',
        }),
      }),
    );

    expect(result).toEqual({
      walletId: 'wallet-1',
      balance: '15000',
      currency: 'IDR',
      transactionId: 'tx-1',
      transactionType: 'TOP_UP',
      amount: '5000',
      balanceAfter: '15000',
      description: 'deposit',
      reference: 'TOPUP-20260611-ABC123',
      createdAt,
    });
  });

  it('throws BadRequestException when sender balance is insufficient', async () => {
    tx.wallet.findUnique.mockResolvedValue({
      id: 'sender-wallet-1',
      userId: 'sender-1',
      balance: new Prisma.Decimal(1000),
      currency: 'IDR',
    });

    tx.user.findUnique.mockResolvedValue({
      id: 'recipient-1',
      username: 'receiver',
      wallet: {
        id: 'recipient-wallet-1',
        userId: 'recipient-1',
        balance: new Prisma.Decimal(5000),
        currency: 'IDR',
      },
    });

    tx.wallet.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.transfer('sender-1', {
        recipientUsername: 'receiver',
        amount: 2000,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.walletTransaction.create).not.toHaveBeenCalled();
  });

  it('transfers balance and creates transfer out and transfer in transactions', async () => {
    const createdAt = new Date();

    tx.wallet.findUnique.mockResolvedValue({
      id: 'sender-wallet-1',
      userId: 'sender-1',
      balance: new Prisma.Decimal(10000),
      currency: 'IDR',
    });

    tx.user.findUnique.mockResolvedValue({
      id: 'recipient-1',
      username: 'receiver',
      wallet: {
        id: 'recipient-wallet-1',
        userId: 'recipient-1',
        balance: new Prisma.Decimal(3000),
        currency: 'IDR',
      },
    });

    tx.wallet.updateMany.mockResolvedValue({ count: 1 });

    tx.wallet.findUniqueOrThrow.mockResolvedValue({
      id: 'sender-wallet-1',
      balance: new Prisma.Decimal(8000),
    });

    tx.wallet.update.mockResolvedValue({
      id: 'recipient-wallet-1',
      balance: new Prisma.Decimal(5000),
    });

    tx.walletTransaction.create
      .mockResolvedValueOnce({
        id: 'transfer-out-1',
        createdAt,
      })
      .mockResolvedValueOnce({
        id: 'transfer-in-1',
      });

    const result = await service.transfer('sender-1', {
      recipientUsername: 'receiver',
      amount: 2000,
      description: 'test transfer',
    });

    expect(tx.wallet.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sender-wallet-1',
        balance: { gte: new Prisma.Decimal(2000) },
      },
      data: {
        balance: { decrement: new Prisma.Decimal(2000) },
      },
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: {
        id: 'recipient-wallet-1',
      },
      data: {
        balance: { increment: new Prisma.Decimal(2000) },
      },
      select: {
        id: true,
        balance: true,
      },
    });

    expect(tx.walletTransaction.create).toHaveBeenCalledTimes(2);

    expect(tx.walletTransaction.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'sender-wallet-1',
          type: 'TRANSFER_OUT',
          amount: new Prisma.Decimal(2000),
          balanceAfter: new Prisma.Decimal(8000),
          description: 'test transfer',
        }),
      }),
    );

    expect(tx.walletTransaction.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          walletId: 'recipient-wallet-1',
          type: 'TRANSFER_IN',
          amount: new Prisma.Decimal(2000),
          balanceAfter: new Prisma.Decimal(5000),
          description: 'test transfer',
        }),
      }),
    );

    expect(result).toEqual({
      reference: expect.any(String),
      senderWalletId: 'sender-wallet-1',
      senderBalance: '8000',
      recipientWalletId: 'recipient-wallet-1',
      recipientUsername: 'receiver',
      recipientBalance: '5000',
      amount: '2000',
      description: 'test transfer',
      transferOutTransactionId: 'transfer-out-1',
      transferInTransactionId: 'transfer-in-1',
      createdAt,
    });
  });
});
