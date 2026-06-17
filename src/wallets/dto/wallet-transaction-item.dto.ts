import { ApiProperty } from '@nestjs/swagger';

export class WalletTransactionItemDto {
  @ApiProperty({
    example: 'cmq3tx000000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: 'TRANSFER_OUT',
  })
  type!: string;

  @ApiProperty({
    example: '25000.00',
  })
  amount!: string;

  @ApiProperty({
    example: '125000.00',
  })
  balanceAfter!: string;

  @ApiProperty({
    example: 'Lunch reimbursement',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    example: 'TRF-20260617-ABC123',
    nullable: true,
  })
  reference!: string | null;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  createdAt!: Date;
}
