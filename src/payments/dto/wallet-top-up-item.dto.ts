import { ApiProperty } from '@nestjs/swagger';

export class WalletTopUpItemDto {
  @ApiProperty({
    example: 'cmq3topup0000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: 'WTU-20260617-ABC123',
  })
  reference!: string;

  @ApiProperty({
    example: '50000.00',
  })
  amount!: string;

  @ApiProperty({
    example: 'IDR',
  })
  currency!: string;

  @ApiProperty({
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    example: 'https://checkout.xendit.co/web/...',
    nullable: true,
  })
  invoiceUrl!: string | null;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
    nullable: true,
  })
  paidAt!: Date | null;

  @ApiProperty({
    example: '2026-06-18T10:00:00.000Z',
    nullable: true,
  })
  expiredAt!: Date | null;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  updatedAt!: Date;
}
