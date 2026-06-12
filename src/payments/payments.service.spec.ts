import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/prisma.service';
import { XenditService } from './xendit/xendit.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const tx = {
    walletTopUp: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    walletTopUp: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const xenditService = {
    createInvoice: jest.fn(),
    verifyCallbackToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(async (callback) => {
      return callback(tx);
    });

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

  it('credits wallet once when Xendit paid webhook is received', async () => {
    const paidAt = '2026-06-11T11:30:00.000Z';

    tx.walletTopUp.findUnique.mockResolvedValue({
      id: 'topup-1',
      userId: 'user-1',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
      reference: 'WTU-20260611-ABC123',
    });

    tx.walletTopUp.updateMany.mockResolvedValue({ count: 1 });

    tx.wallet.update.mockResolvedValue({
      id: 'wallet-1',
      balance: new Prisma.Decimal(150000),
    });

    tx.walletTransaction.create.mockResolvedValue({
      id: 'wallet-transaction-1',
    });

    const result = await service.handleXenditInvoiceWebhook('callback-token', {
      id: 'xendit-invoice-1',
      external_id: 'WTU-20260611-ABC123',
      status: 'PAID',
      amount: 50000,
      paid_at: paidAt,
    });

    expect(xenditService.verifyCallbackToken).toHaveBeenCalledWith(
      'callback-token',
    );

    expect(tx.walletTopUp.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'topup-1',
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        xenditInvoiceId: 'xendit-invoice-1',
        paidAt: new Date(paidAt),
      },
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: {
        balance: {
          increment: new Prisma.Decimal(50000),
        },
      },
      select: {
        id: true,
        balance: true,
      },
    });

    expect(tx.walletTransaction.create).toHaveBeenCalledWith({
      data: {
        walletId: 'wallet-1',
        type: 'TOP_UP',
        amount: new Prisma.Decimal(50000),
        balanceAfter: new Prisma.Decimal(150000),
        description: 'Xendit wallet top-up WTU-20260611-ABC123',
        reference: 'WTU-20260611-ABC123',
      },
    });

    expect(result).toEqual({
      received: true,
      credited: true,
      status: 'PAID',
    });
  });

  it('does not credit wallet again for duplicate paid webhook', async () => {
    tx.walletTopUp.findUnique.mockResolvedValue({
      id: 'topup-1',
      userId: 'user-1',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PAID',
      reference: 'WTU-20260611-ABC123',
    });

    const result = await service.handleXenditInvoiceWebhook('callback-token', {
      id: 'xendit-invoice-1',
      external_id: 'WTU-20260611-ABC123',
      status: 'PAID',
      amount: 50000,
    });

    expect(tx.walletTopUp.updateMany).not.toHaveBeenCalled();
    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletTransaction.create).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
      credited: false,
      status: 'PAID',
    });
  });

  it('marks pending wallet top-up as expired', async () => {
    const result = await service.handleXenditInvoiceWebhook('callback-token', {
      id: 'xendit-invoice-1',
      external_id: 'WTU-20260611-ABC123',
      status: 'EXPIRED',
      amount: 50000,
    });

    expect(prisma.walletTopUp.updateMany).toHaveBeenCalledWith({
      where: {
        reference: 'WTU-20260611-ABC123',
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    });

    expect(result).toEqual({
      received: true,
      credited: false,
      status: 'EXPIRED',
    });
  });

  it('marks wallet top-up as FAILED when Xendit invoice creation fails', async () => {
    const xenditError = new Error('Xendit unavailable');

    prisma.user.findUnique.mockResolvedValue({
      email: 'user@example.com',
    });

    prisma.walletTopUp.create.mockResolvedValue({
      id: 'topup-1',
      reference: 'WTU-20260612-ABC123',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
    });

    xenditService.createInvoice.mockRejectedValue(xenditError);

    await expect(
      service.createWalletTopUp('user-1', {
        amount: 50000,
      }),
    ).rejects.toThrow('Xendit unavailable');

    expect(prisma.walletTopUp.update).toHaveBeenCalledWith({
      where: { id: 'topup-1' },
      data: { status: 'FAILED' },
    });
  });

  it('ignores extra Xendit webhook fields and credits wallet', async () => {
    const paidAt = '2026-06-11T11:30:00.000Z';

    tx.walletTopUp.findUnique.mockResolvedValue({
      id: 'topup-1',
      userId: 'user-1',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
      reference: 'WTU-20260611-ABC123',
    });

    tx.walletTopUp.updateMany.mockResolvedValue({ count: 1 });

    tx.wallet.update.mockResolvedValue({
      id: 'wallet-1',
      balance: new Prisma.Decimal(150000),
    });

    tx.walletTransaction.create.mockResolvedValue({
      id: 'wallet-transaction-1',
    });

    const result = await service.handleXenditInvoiceWebhook('callback-token', {
      id: 'xendit-invoice-1',
      external_id: 'WTU-20260611-ABC123',
      status: 'PAID',
      amount: 50000,
      paid_amount: 50000,
      currency: 'IDR',
      paid_at: paidAt,

      payment_id: 'payment-id-1',
      payment_method_id: 'payment-method-id-1',
      payment_details: {
        source: 'CREDIT_CARD',
      },
      credit_card_token: 'credit-card-token-1',
      credit_card_charge_id: 'credit-card-charge-1',
      user_id: 'xendit-user-1',
      payment_method: 'CREDIT_CARD',
      merchant_name: 'Xendit',
    });

    expect(result).toEqual({
      received: true,
      credited: true,
      status: 'PAID',
    });

    expect(tx.walletTopUp.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'topup-1',
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        xenditInvoiceId: 'xendit-invoice-1',
        paidAt: new Date(paidAt),
      },
    });

    expect(tx.wallet.update).toHaveBeenCalled();
    expect(tx.walletTransaction.create).toHaveBeenCalled();
  });

  it('returns existing wallet top-up for the same idempotency key', async () => {
    prisma.walletTopUp.findUnique.mockResolvedValue({
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      amount: new Prisma.Decimal(50000),
      currency: 'IDR',
      status: 'PENDING',
      xenditInvoiceUrl: 'https://checkout.xendit.co/invoice-1',
    });

    const result = await service.createWalletTopUp(
      'user-1',
      { amount: 50000 },
      'idem-key-1',
    );

    expect(prisma.walletTopUp.findUnique).toHaveBeenCalledWith({
      where: {
        userId_idempotencyKey: {
          userId: 'user-1',
          idempotencyKey: 'idem-key-1',
        },
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

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.walletTopUp.create).not.toHaveBeenCalled();
    expect(xenditService.createInvoice).not.toHaveBeenCalled();

    expect(result).toEqual({
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      status: 'PENDING',
      amount: '50000',
      currency: 'IDR',
      invoiceUrl: 'https://checkout.xendit.co/invoice-1',
    });
  });
});
