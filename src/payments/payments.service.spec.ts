import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/prisma.service';
import { XenditService } from './xendit/xendit.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    walletTopUp: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const xenditService = {
    createInvoice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: XenditService, useValue: xenditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a pending wallet top-up and Xendit invoice', async () => {
    const expiredAt = new Date('2026-06-11T10:00:00.000Z');

    prisma.user.findUnique.mockResolvedValue({
      email: 'user@example.com',
    });

    prisma.walletTopUp.create.mockResolvedValue({
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
    });

    xenditService.createInvoice.mockResolvedValue({
      id: 'xendit-invoice-1',
      externalId: 'WTU-20260611-ABC123',
      status: 'PENDING',
      invoiceUrl: 'https://checkout.xendit.co/invoice-1',
      amount: 50000,
      currency: 'IDR',
      expiryDate: expiredAt.toISOString(),
    });

    prisma.walletTopUp.update.mockResolvedValue({
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
      xenditInvoiceUrl: 'https://checkout.xendit.co/invoice-1',
    });

    const result = await service.createWalletTopUp('user-1', {
      amount: 50000,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true },
    });

    expect(prisma.walletTopUp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        amount: new Prisma.Decimal(50000),
        currency: 'IDR',
        status: 'PENDING',
      }),
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        status: true,
      },
    });

    expect(xenditService.createInvoice).toHaveBeenCalledWith({
      externalId: 'WTU-20260611-ABC123',
      amount: 50000,
      payerEmail: 'user@example.com',
      description: 'Wallet top up WTU-20260611-ABC123',
      currency: 'IDR',
    });

    expect(prisma.walletTopUp.update).toHaveBeenCalledWith({
      where: { id: 'topup-1' },
      data: {
        xenditInvoiceId: 'xendit-invoice-1',
        xenditInvoiceUrl: 'https://checkout.xendit.co/invoice-1',
        expiredAt,
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

    expect(result).toEqual({
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      status: 'PENDING',
      amount: '50000',
      currency: 'IDR',
      invoiceUrl: 'https://checkout.xendit.co/invoice-1',
    });
  });

  it('throws NotFoundException when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.createWalletTopUp('user-1', { amount: 50000 }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.walletTopUp.create).not.toHaveBeenCalled();
    expect(xenditService.createInvoice).not.toHaveBeenCalled();
  });
});
