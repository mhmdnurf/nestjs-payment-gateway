import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const paymentsService = {
    createWalletTopUp: jest.fn(),
    handleXenditInvoiceWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a wallet top-up for authenticated user', async () => {
    const response = {
      id: 'topup-1',
      reference: 'WTU-20260611-ABC123',
      status: 'PENDING',
      amount: '50000',
      currency: 'IDR',
      invoiceUrl: 'https://checkout.xendit.co/invoice-1',
    };

    paymentsService.createWalletTopUp.mockResolvedValue(response);

    const result = await controller.createWalletTopUp(
      { user: { sub: 'user-1' } } as any,
      { amount: 50000 },
    );

    expect(paymentsService.createWalletTopUp).toHaveBeenCalledWith('user-1', {
      amount: 50000,
    });
    expect(result).toBe(response);
  });

  it('throws UnauthorizedException when access token payload has no sub', async () => {
    await expect(
      controller.createWalletTopUp({ user: {} } as any, { amount: 50000 }),
    ).rejects.toThrow(UnauthorizedException);

    expect(paymentsService.createWalletTopUp).not.toHaveBeenCalled();
  });

  it('forwards Xendit webhook token and payload to payments service', async () => {
    const response = {
      received: true,
      credited: true,
      status: 'PAID',
    };

    const payload = {
      id: 'xendit-invoice-1',
      external_id: 'WTU-20260611-ABC123',
      status: 'PAID',
      amount: 50000,
    };

    paymentsService.handleXenditInvoiceWebhook.mockResolvedValue(response);

    const result = await controller.handleXenditWebhook(
      'callback-token',
      payload,
    );

    expect(paymentsService.handleXenditInvoiceWebhook).toHaveBeenCalledWith(
      'callback-token',
      payload,
    );
    expect(result).toBe(response);
  });
});
