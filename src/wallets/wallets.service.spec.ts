import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;

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
});
