import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAccessGuard } from 'src/auth/guards/jwt-access.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('WalletsController', () => {
  let controller: WalletsController;

  const walletsService = {
    me: jest.fn(),
    topUp: jest.fn(),
    meTransactions: jest.fn(),
    transfer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: walletsService }],
    })
      .overrideGuard(JwtAccessGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls service.me with authenticated user id', async () => {
    const wallet = {
      id: 'wallet-1',
      balance: '10000',
      currency: 'IDR',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    walletsService.me.mockResolvedValue(wallet);

    const result = await controller.me({
      user: { sub: 'user-1' },
    } as any);

    expect(walletsService.me).toHaveBeenCalledWith('user-1');
    expect(result).toBe(wallet);
  });

  it('throws UnauthorizedException when access token payload has no sub', async () => {
    await expect(controller.me({ user: {} } as any)).rejects.toThrow(
      UnauthorizedException,
    );

    expect(walletsService.me).not.toHaveBeenCalled();
  });
});
