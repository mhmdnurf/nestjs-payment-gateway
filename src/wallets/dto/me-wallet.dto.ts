import { ApiProperty } from '@nestjs/swagger';

export class MeWalletResponseDto {
  @ApiProperty({
    example: 'cmq3lkcoo0000or0s7df18ia0',
  })
  id!: string;

  @ApiProperty({
    example: '150000.00',
    description: 'Wallet balance represented as a decimal string',
  })
  balance!: string;

  @ApiProperty({
    example: 'IDR',
  })
  currency!: string;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-06-17T10:00:00.000Z',
  })
  updatedAt!: Date;
}
